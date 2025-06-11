import { DifyEventData, WorkflowState, SSEProcessorConfig, ErrorEventData } from '../utils/types';

/**
 * SSE流处理器
 * 处理Dify API的Server-Sent Events流
 */
export class SSEStreamProcessor {
  private encoder = new TextEncoder();
  private state: WorkflowState;

  constructor(
    private config: SSEProcessorConfig,
    private controller: ReadableStreamDefaultController<Uint8Array>
  ) {
    // 初始化工作流状态
    this.state = {
      taskId: '',
      workflowRunId: '',
      workflowId: '',
      progress: 0,
      finishedSteps: 0,
      totalSteps: config.progress.totalSteps
    };
  }

  /**
   * 处理SSE数据块
   */
  async processChunk(chunk: string): Promise<void> {
    // Split chunk into individual lines or events based on SSE format
    const lines = chunk.split('\n').filter(line => line.trim() !== '');
    
    // 记录接收到的原始数据块 - 保持原有日志格式
    console.log(`[${new Date().toISOString()}] 接收Dify数据: ${chunk.replace(/\n/g, '\\n')}`);
    
    for (const line of lines) {
      await this.processLine(line);
    }
  }

  /**
   * 处理单行SSE数据
   */
  private async processLine(line: string): Promise<void> {
    if (line.trim() === 'event: ping') {
      await this.handlePingEvent();
    } else if (line.startsWith('data: ')) {
      await this.handleDataEvent(line);
    }
  }

  /**
   * 处理ping事件
   */
  private async handlePingEvent(): Promise<void> {
    // Handle ping event: Increment progress slowly if below max
    if (this.state.progress < this.config.progress.maxProgress) {
      const newProgress = Math.min(
        this.state.progress + this.config.progress.pingIncrement, 
        this.config.progress.maxProgress
      );
      
      if (newProgress > this.state.progress) {
        this.state.progress = newProgress;
        const progressEvent = this.createProgressEvent(newProgress, "running");
        
        console.log(`[${new Date().toISOString()}] [Ping Received] 发送小增量进度更新: ${newProgress}%`);
        this.enqueueEvent(progressEvent);
      }
    }
  }

  /**
   * 处理数据事件
   */
  private async handleDataEvent(line: string): Promise<void> {
    try {
      const eventData: DifyEventData = JSON.parse(line.substring(6));
      
      // 记录事件类型 - 保持原有日志格式
      console.log(`[${new Date().toISOString()}] 接收到Dify事件: ${eventData.event || 'unknown'}`);
      
      // 更新状态中的ID信息
      this.updateStateFromEvent(eventData);
      
      // 根据事件类型处理
      switch (eventData.event) {
        case 'workflow_started':
          await this.handleWorkflowStarted(eventData);
          break;
        case 'node_finished':
          await this.handleNodeFinished(eventData);
          break;
        case 'node_started':
          await this.handleNodeStarted(eventData);
          break;
        case 'text_chunk':
          await this.handleTextChunk(eventData);
          break;
        case 'workflow_finished':
          await this.handleWorkflowFinished(eventData);
          break;
        default:
          // 处理自定义事件处理器
          if (this.config.customEventHandlers?.[eventData.event]) {
            const customEvent = this.config.customEventHandlers[eventData.event](eventData, this.state);
            if (customEvent) {
              this.enqueueEvent(customEvent);
            }
          }
      }
    } catch (e) {
      console.error(`[${new Date().toISOString()}] 解析Dify事件数据时出错:`, e);
      console.error(`[${new Date().toISOString()}] 解析失败的数据: ${line.substring(6)}`);
    }
  }

  /**
   * 从事件数据更新状态
   */
  private updateStateFromEvent(eventData: DifyEventData): void {
    if (eventData.task_id) {
      this.state.taskId = eventData.task_id;
    }
    if (eventData.workflow_run_id) {
      this.state.workflowRunId = eventData.workflow_run_id;
    }
  }

  /**
   * 处理工作流开始事件
   */
  private async handleWorkflowStarted(eventData: DifyEventData): Promise<void> {
    // 从workflow_started事件中提取workflowId
    if (eventData.data?.workflow_id) {
      this.state.workflowId = String(eventData.data.workflow_id);
      console.log(`[${new Date().toISOString()}] 获取到workflowId: ${this.state.workflowId}`);
    } else if (eventData.data?.inputs?.['sys.workflow_id']) {
      const inputWorkflowId = eventData.data.inputs['sys.workflow_id'];
      this.state.workflowId = typeof inputWorkflowId === 'string' ? inputWorkflowId : String(inputWorkflowId);
      console.log(`[${new Date().toISOString()}] 从inputs获取到workflowId: ${this.state.workflowId}`);
    } else {
      this.state.workflowId = "";
      console.log(`[${new Date().toISOString()}] 使用默认workflowId: ${this.state.workflowId}`);
    }

    // 发送workflow_started事件
    const startEvent = {
      event: "workflow_started",
      task_id: this.state.taskId,
      workflow_run_id: this.state.workflowRunId,
      data: {
        workflow_id: this.state.workflowId,
        progress: "0",
        status: "running"
      }
    };

    console.log(`[${new Date().toISOString()}] 发送开始事件: ${JSON.stringify(startEvent)}`);
    this.enqueueEvent(startEvent);
    this.state.progress = 0;
  }

  /**
   * 处理节点完成事件
   */
  private async handleNodeFinished(eventData: DifyEventData): Promise<void> {
    // 节点完成，增加完成步数
    this.state.finishedSteps += 1;
    console.log(`[${new Date().toISOString()}] 节点完成: ${this.state.finishedSteps}/${this.state.totalSteps}`);

    // 计算进度百分比（最多到maxProgress）
    const progressPercent = Math.min(
      Math.floor((this.state.finishedSteps / this.state.totalSteps) * 100), 
      this.config.progress.maxProgress
    );

    // 只有当进度有变化时才发送更新
    if (progressPercent > this.state.progress) {
      this.state.progress = progressPercent;
      const progressEvent = this.createProgressEvent(progressPercent, "running");
      
      console.log(`[${new Date().toISOString()}] 发送进度更新: ${progressPercent}%`);
      this.enqueueEvent(progressEvent);
    }
  }

  /**
   * 处理节点开始事件
   */
  private async handleNodeStarted(eventData: DifyEventData): Promise<void> {
    console.log(`[${new Date().toISOString()}] 节点开始`);

    // 如果当前进度接近maxProgress但还未完成，可以降低进度变化速度
    if (this.state.progress >= 90 && this.state.progress < this.config.progress.maxProgress) {
      const smallIncrement = 1;
      const newProgress = Math.min(this.state.progress + smallIncrement, this.config.progress.maxProgress);
      
      if (newProgress > this.state.progress) {
        this.state.progress = newProgress;
        const progressEvent = this.createProgressEvent(newProgress, "running");
        
        console.log(`[${new Date().toISOString()}] 发送小增量进度更新: ${newProgress}%`);
        this.enqueueEvent(progressEvent);
      }
    }
  }

  /**
   * 处理文本块事件
   */
  private async handleTextChunk(eventData: DifyEventData): Promise<void> {
    console.log(`[${new Date().toISOString()}] 接收到文本块`);

    // 转发文本块事件
    if (eventData.data?.text) {
      const textChunkEvent = {
        event: "text_chunk",
        task_id: this.state.taskId,
        workflow_run_id: this.state.workflowRunId,
        data: {
          ...eventData.data
          // 注意：这里不应该覆盖title，应该保持原有的title或者使用外部传入的当前步骤title
        }
      };

      const textContent = typeof eventData.data.text === 'string' ? eventData.data.text : String(eventData.data.text);
      console.log(`[${new Date().toISOString()}] 转发文本块事件: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`);
      
      this.enqueueEvent(textChunkEvent);
    }
  }

  /**
   * 处理工作流完成事件
   */
  private async handleWorkflowFinished(eventData: DifyEventData): Promise<void> {
    console.log(`[${new Date().toISOString()}] 工作流完成`);

    // 如果在workflow_finished事件中可以获取workflowId，则更新
    if (eventData.data?.workflow_id && !this.state.workflowId) {
      this.state.workflowId = eventData.data.workflow_id;
      console.log(`[${new Date().toISOString()}] 从完成事件获取workflowId: ${this.state.workflowId}`);
    }

    // 完成事件，解析结果
    let result: string[] = [];
    
    if (eventData.data?.outputs?.result) {
      const outputResult = eventData.data.outputs.result;
      if (Array.isArray(outputResult)) {
        result = outputResult.filter((title: string) => title && typeof title === 'string' && title.trim() !== '');
        console.log(`[${new Date().toISOString()}] 直接使用数组结果，共${result.length}个标题`);
      } else if (typeof outputResult === 'string') {
        result = outputResult.split('\n\n').filter((title: string) => title.trim() !== '');
        console.log(`[${new Date().toISOString()}] 将字符串结果分割为数组，共${result.length}个标题`);
      }
      
      console.log(`[${new Date().toISOString()}] 解析到${result.length}个结果标题`);
      console.log(`[${new Date().toISOString()}] 结果内容: ${JSON.stringify(result)}`);
    }

    // 发送完成事件，进度设为100%
    const finishEvent = {
      event: "workflow_finished",
      task_id: this.state.taskId,
      workflow_run_id: this.state.workflowRunId,
      data: {
        workflow_id: this.state.workflowId,
        progress: "100",
        result,
        elapsed_time: eventData.data?.elapsed_time?.toString() || "0",
        status: "succeeded"
      }
    };

    console.log(`[${new Date().toISOString()}] 发送完成事件, 耗时: ${eventData.data?.elapsed_time || 'unknown'}`);
    this.enqueueEvent(finishEvent);
  }

  /**
   * 处理错误情况
   */
  handleError(error: unknown): void {
    console.error(`[${new Date().toISOString()}] 调用Dify API时出错:`, error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`[${new Date().toISOString()}] 错误信息: ${errorMessage}`);
    
    // 发送错误事件
    const errorEvent: ErrorEventData = {
      event: "workflow_finished",
      task_id: "error-" + Date.now(),
      workflow_run_id: "error-" + Date.now(),
      data: {
        workflow_id: "",
        progress: "100",
        result: [`调用Dify API时出错: ${errorMessage}`],
        status: "failed"
      }
    };
    
    this.enqueueEvent(errorEvent);
  }

  /**
   * 创建进度事件
   */
  private createProgressEvent(progress: number, status: string): DifyEventData {
    return {
      event: "workflow_running",
      task_id: this.state.taskId,
      workflow_run_id: this.state.workflowRunId,
      data: {
        workflow_id: this.state.workflowId,
        progress: progress.toString(),
        status
      }
    };
  }

  /**
   * 将事件加入队列
   */
  private enqueueEvent(event: any): void {
    this.controller.enqueue(this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  }

  /**
   * 获取当前状态
   */
  getState(): WorkflowState {
    return { ...this.state };
  }
}