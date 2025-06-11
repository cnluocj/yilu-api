import { AnimationState } from '../utils/types';

/**
 * 动画管理器
 * 管理文章生成过程中的emoji和省略号动画
 */
export class AnimationManager {
  private state: AnimationState;
  private animationIntervalId: NodeJS.Timeout | null = null;
  private readonly ellipsisStates = ['.', '..', '...'];
  private readonly animationInterval = 600; // 600ms间隔

  constructor(
    private titleMapping: Record<string, { title: string; emojiPair: string[] }>,
    private defaultEmojiPair: string[],
    private onAnimationUpdate: (title: string) => void
  ) {
    this.state = {
      lastTitle: '开始生成文章',
      emojiPair: defaultEmojiPair,
      currentEmojiIndex: 0,
      currentEllipsisIndex: 0,
      isRunning: false
    };
  }

  /**
   * 启动动画定时器
   */
  startAnimation(): void {
    if (this.animationIntervalId) {
      clearInterval(this.animationIntervalId);
    }

    this.state.isRunning = true;
    this.animationIntervalId = setInterval(() => {
      if (!this.state.isRunning) {
        this.stopAnimation();
        return;
      }

      // 构建动画标题：emoji前缀 + 基础标题 + 省略号后缀
      const emojiPrefix = (this.state.emojiPair && this.state.emojiPair.length >= 2) 
        ? `${this.state.emojiPair[this.state.currentEmojiIndex]} ` 
        : '';
      const ellipsisSuffix = this.ellipsisStates[this.state.currentEllipsisIndex];
      const displayTitle = `${emojiPrefix}${this.state.lastTitle}${ellipsisSuffix}`;

      // 切换emoji索引（在两个emoji之间循环）
      this.state.currentEmojiIndex = (this.state.currentEmojiIndex + 1) % 2;
      // 循环省略号索引
      this.state.currentEllipsisIndex = (this.state.currentEllipsisIndex + 1) % this.ellipsisStates.length;

      // 触发动画更新回调
      this.onAnimationUpdate(displayTitle);

    }, this.animationInterval);
  }

  /**
   * 停止动画定时器
   */
  stopAnimation(): void {
    this.state.isRunning = false;
    if (this.animationIntervalId) {
      clearInterval(this.animationIntervalId);
      this.animationIntervalId = null;
    }
  }

  /**
   * 更新标题（根据节点标题映射）
   */
  updateTitle(nodeTitle?: string): void {
    if (!nodeTitle) return;

    // 查找标题映射
    const mapping = this.titleMapping[nodeTitle];
    if (mapping) {
      this.state.lastTitle = mapping.title;
      this.state.emojiPair = mapping.emojiPair;
      console.log(`[${new Date().toISOString()}] 节点标题映射: "${nodeTitle}" -> "${mapping.title}" [${mapping.emojiPair.join(', ')}]`);
    } else {
      // 使用默认emoji，保持节点标题
      this.state.lastTitle = nodeTitle;
      this.state.emojiPair = this.defaultEmojiPair;
      console.log(`[${new Date().toISOString()}] 使用默认映射: "${nodeTitle}" [${this.defaultEmojiPair.join(', ')}]`);
    }
  }

  /**
   * 设置自定义标题
   */
  setTitle(title: string, emojiPair?: string[]): void {
    this.state.lastTitle = title;
    if (emojiPair) {
      this.state.emojiPair = emojiPair;
    }
  }

  /**
   * 获取当前显示标题（不带动画效果）
   */
  getCurrentTitle(): string {
    return this.state.lastTitle;
  }

  /**
   * 获取当前emoji对
   */
  getCurrentEmojiPair(): string[] {
    return this.state.emojiPair;
  }

  /**
   * 检查动画是否正在运行
   */
  isRunning(): boolean {
    return this.state.isRunning;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAnimation();
  }
}