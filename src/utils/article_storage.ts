import { supabase } from './supabase';
import { GenerateArticleRequest } from '@/types';

/**
 * 检查并创建文章存储桶（如果不存在）
 */
export async function ensureArticlesBucketExists(): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] 检查文章存储桶是否存在`);
    
    // 检查存储桶是否存在
    const { error } = await supabase.storage.getBucket('articles');
    
    if (error) {
      // 检查是否是因为存储桶不存在
      if (error.message && error.message.includes('not found')) {
        // 创建存储桶
        const { error: createError } = await supabase.storage.createBucket('articles', {
          public: true, // 设置为公开访问
          fileSizeLimit: 10485760 // 限制文件大小为10MB
        });
        
        if (createError) {
          console.error(`[${new Date().toISOString()}] 创建文章存储桶出错:`, createError);
          throw createError;
        }
        
        console.log(`[${new Date().toISOString()}] 文章存储桶 'articles' 创建成功`);
      } else {
        console.error(`[${new Date().toISOString()}] 检查文章存储桶时出错:`, error);
        throw error;
      }
    } else {
      console.log(`[${new Date().toISOString()}] 文章存储桶 'articles' 已存在`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 确保文章存储桶存在时出错:`, err);
    throw err;
  }
}

/**
 * 获取文件扩展名
 */
function getFileExtension(url: string): string {
  // 从URL提取文件名
  const fileName = url.split('?')[0].split('/').pop() || '';
  
  // 从文件名提取扩展名
  const ext = fileName.split('.').pop();
  
  // 返回扩展名，如果没有则默认为docx
  return ext && ext.length < 6 ? ext : 'docx';
}

/**
 * 生成安全的文件名（移除特殊字符，限制长度）
 */
function getSafeFileName(title: string): string {
  // 替换不安全的字符为下划线
  const safeName = title
    .replace(/[^\w\u4e00-\u9fa5\- ]/g, '')  // 移除除了字母、数字、汉字、连字符和空格之外的字符
    .replace(/\s+/g, '_');  // 将空格替换为下划线
  
  // 限制文件名长度
  return safeName.length > 50 ? safeName.substring(0, 50) : safeName;
}

/**
 * 查找可用的文件名（处理重名情况）
 */
async function findAvailableFileName(
  userId: string, 
  desiredName: string, 
  extension: string
): Promise<string> {
  try {
    // 检查用户文件夹
    const userPath = `${userId}/`;
    
    // 获取用户文件夹中所有文件
    const { data: existingFiles, error } = await supabase
      .storage
      .from('articles')
      .list(userPath);
    
    if (error) {
      console.error(`[${new Date().toISOString()}] 获取用户文件列表出错:`, error);
      // 如果是因为路径不存在，则视为没有重名文件
      if (error.message.includes('not found')) {
        return `${desiredName}.${extension}`;
      }
      throw error;
    }
    
    // 检查是否有同名文件
    const baseName = desiredName;
    let fileName = `${baseName}.${extension}`;
    let counter = 1;
    
    // 检查文件名是否已存在
    while (existingFiles?.some(file => file.name === fileName)) {
      // 文件名已存在，添加计数器
      fileName = `${baseName}(${counter}).${extension}`;
      counter++;
    }
    
    return fileName;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 查找可用文件名时出错:`, err);
    // 出错时返回带时间戳的文件名，确保唯一
    return `${desiredName}_${Date.now()}.${extension}`;
  }
}

/**
 * 将Dify生成的文章保存到Supabase并记录到数据库
 */
export async function saveArticleToSupabase(
  fileUrl: string,
  userId: string,
  articleInfo: Omit<GenerateArticleRequest, 'openid'> & { dify_task_id?: string }
): Promise<{ recordId: string, publicUrl: string, filePath: string }> {
  try {
    console.log(`[${new Date().toISOString()}] 开始保存文章到Supabase, 用户: ${userId}`);
    
    // 确保存储桶存在
    await ensureArticlesBucketExists();
    
    // 步骤1: 从Dify下载文件
    console.log(`[${new Date().toISOString()}] 从Dify下载文件: ${fileUrl}`);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.status} ${response.statusText}`);
    }
    
    // 获取文件内容为Blob
    const fileBlob = await response.blob();
    
    // 从URL直接获取原始文件名
    const originalFileName = fileUrl.split('?')[0].split('/').pop() || '';
    console.log(`[${new Date().toISOString()}] 使用Dify原始文件名: ${originalFileName}`);
    
    // 如果没有获取到文件名，则使用时间戳
    const fileName = originalFileName || `file_${Date.now()}.docx`;
    
    // 构建文件路径
    const filePath = `${userId}/${fileName}`;
    
    // 步骤2: 上传文件到Supabase
    console.log(`[${new Date().toISOString()}] 上传文件到Supabase路径: ${filePath}`);
    
    // 根据文件扩展名设置contentType
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream'; // 默认
    if (extension === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (extension === 'pdf') {
      contentType = 'application/pdf';
    } else if (extension === 'txt') {
      contentType = 'text/plain';
    }
    
    const { error: uploadError } = await supabase
      .storage
      .from('articles')
      .upload(filePath, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType
      });
    
    if (uploadError) {
      console.error(`[${new Date().toISOString()}] 上传文件到Supabase出错:`, uploadError);
      throw uploadError;
    }
    
    // 步骤3: 获取文件的公共URL
    const { data: urlData } = supabase
      .storage
      .from('articles')
      .getPublicUrl(filePath);
    
    const publicUrl = urlData.publicUrl;
    console.log(`[${new Date().toISOString()}] 获取到公共URL: ${publicUrl}`);
    
    // 步骤4: 记录到数据库
    console.log(`[${new Date().toISOString()}] 记录文章信息到数据库`);
    const { data: recordData, error: recordError } = await supabase
      .from('article_records')
      .insert({
        user_id: userId,
        direction: articleInfo.direction,
        word_count: articleInfo.word_count || 1000,
        author_name: articleInfo.name,
        unit: articleInfo.unit,
        title: articleInfo.title || null,
        file_path: filePath,
        public_url: publicUrl,
        dify_task_id: articleInfo.dify_task_id || null,
        style: articleInfo.style || null
      })
      .select('id')
      .single();
    
    if (recordError) {
      console.error(`[${new Date().toISOString()}] 记录文章信息到数据库出错:`, recordError);
      throw recordError;
    }
    
    console.log(`[${new Date().toISOString()}] 文章保存成功, 记录ID: ${recordData.id}`);
    
    return {
      recordId: recordData.id,
      publicUrl,
      filePath
    };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 保存文章到Supabase时出错:`, err);
    throw err;
  }
}

/**
 * 获取用户的文章列表
 */
export async function getUserArticles(
  userId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ records: Record<string, unknown>[], total: number }> {
  try {
    console.log(`[${new Date().toISOString()}] 获取用户(${userId})的文章列表, 限制: ${limit}, 偏移: ${offset}`);
    
    const { data, error, count } = await supabase
      .from('article_records')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error(`[${new Date().toISOString()}] 获取用户文章列表出错:`, error);
      throw error;
    }
    
    console.log(`[${new Date().toISOString()}] 获取到${data?.length || 0}篇文章，总数: ${count || 0}`);
    
    return {
      records: data || [],
      total: count || 0
    };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 获取用户文章列表时出错:`, err);
    throw err;
  }
}

/**
 * 删除文章
 */
export async function deleteArticle(userId: string, articleId: string): Promise<boolean> {
  try {
    console.log(`[${new Date().toISOString()}] 删除文章, ID: ${articleId}, 用户: ${userId}`);
    
    // 获取文章记录
    const { data: article, error: getError } = await supabase
      .from('article_records')
      .select('file_path')
      .eq('id', articleId)
      .eq('user_id', userId)
      .single();
    
    if (getError) {
      console.error(`[${new Date().toISOString()}] 获取文章记录出错:`, getError);
      throw getError;
    }
    
    if (!article) {
      throw new Error('未找到文章或无权限删除');
    }
    
    // 从存储中删除文件
    const { error: deleteFileError } = await supabase
      .storage
      .from('articles')
      .remove([article.file_path]);
    
    if (deleteFileError) {
      console.error(`[${new Date().toISOString()}] 删除存储文件出错:`, deleteFileError);
      // 即使删除文件失败，也继续删除数据库记录
    }
    
    // 从数据库中删除记录
    const { error: deleteRecordError } = await supabase
      .from('article_records')
      .delete()
      .eq('id', articleId)
      .eq('user_id', userId);
    
    if (deleteRecordError) {
      console.error(`[${new Date().toISOString()}] 删除文章记录出错:`, deleteRecordError);
      throw deleteRecordError;
    }
    
    console.log(`[${new Date().toISOString()}] 文章删除成功, ID: ${articleId}`);
    return true;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 删除文章时出错:`, err);
    throw err;
  }
} 