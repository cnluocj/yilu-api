# 文章存储系统

这个系统负责管理用户生成的文章，包括文章的存储、检索和删除等功能。

## 数据库结构

系统使用 Supabase 数据库存储文章相关信息，并使用 Supabase Storage 存储文章文件。

### article_records 表

该表存储文章的元数据：

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | SERIAL | 主键 |
| user_id | TEXT | 用户ID |
| direction | TEXT | 文章方向/主题 |
| word_count | INTEGER | 文章字数 |
| author_name | TEXT | 作者名称 |
| unit | TEXT | 单位/机构 |
| title | TEXT | 文章标题 (可选) |
| file_path | TEXT | 文件在存储中的路径 |
| public_url | TEXT | 文件公开访问URL |
| dify_task_id | TEXT | Dify任务ID (可选) |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 存储结构

文章文件存储在 Supabase Storage 的 `articles` 存储桶中，使用以下路径格式：

```
articles/
  └── {用户ID}/
      └── {文件名}.{扩展名}
```

## 主要功能

系统提供以下主要功能：

### 存储桶管理

- `ensureArticlesBucketExists()`: 检查并创建文章存储桶

### 文件名处理

- `getFileExtension(url)`: 从URL提取文件扩展名
- `getSafeFileName(title)`: 生成安全的文件名
- `findAvailableFileName(userId, desiredName, extension)`: 查找可用的文件名，避免重名

### 文章管理

- `saveArticleToSupabase(fileUrl, userId, articleInfo)`: 将Dify生成的文章保存到Supabase并记录到数据库
- `getUserArticles(userId, limit, offset)`: 获取用户的文章列表，支持分页
- `deleteArticle(userId, articleId)`: 删除指定的文章记录和存储文件

## 使用示例

### 保存文章

```typescript
try {
  const articleInfo = {
    direction: "科普",
    word_count: 1500,
    name: "张三",
    unit: "XX研究所",
    title: "人工智能发展简述"
  };
  
  const result = await saveArticleToSupabase(
    "http://example.com/files/document.docx",
    "user123",
    articleInfo
  );
  
  console.log(`文章已保存，记录ID: ${result.recordId}`);
  console.log(`文章公开URL: ${result.publicUrl}`);
} catch (error) {
  console.error("保存文章失败:", error);
}
```

### 获取用户文章列表

```typescript
try {
  const { records, total } = await getUserArticles("user123", 10, 0);
  console.log(`用户共有 ${total} 篇文章`);
  records.forEach(article => {
    console.log(`- ${article.title}: ${article.public_url}`);
  });
} catch (error) {
  console.error("获取文章列表失败:", error);
}
```

### 删除文章

```typescript
try {
  const success = await deleteArticle("user123", "article456");
  if (success) {
    console.log("文章已成功删除");
  }
} catch (error) {
  console.error("删除文章失败:", error);
}
```

## 安全性

系统使用 Supabase 的行级安全策略确保数据安全：

1. 用户只能查看、更新和删除自己的文章
2. 服务角色可以访问所有文章记录
3. 存储桶设置了合适的权限控制

## 整合到API

文章管理功能集成到了以下API端点：

- `POST /api/generate_article`: 生成并保存文章
- `GET /api/articles`: 获取用户的文章列表
- `DELETE /api/articles/{id}`: 删除指定文章 