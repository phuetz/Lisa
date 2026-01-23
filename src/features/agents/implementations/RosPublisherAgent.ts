import { AgentDomains, type BaseAgent, type AgentExecuteProps, type AgentExecuteResult } from "./types";
import { RosService } from "../services/RosService";

export class RosPublisherAgent implements BaseAgent {
  name = "RosPublisherAgent";
  description = "Publishes messages to ROS topics.";
  version = "0.1.0";
  domain = AgentDomains.INTEGRATION;
  capabilities = ["publish"];

  private rosService: RosService;

  constructor() {
    this.rosService = new RosService(import.meta.env.VITE_ROS_BRIDGE_URL || "ws://localhost:9090");
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    if (intent !== "publish") {
      return { success: false, output: null, error: `Unknown intent: ${intent}` };
    }

    const { topicName, messageType, messageContent } = parameters;

    if (!topicName || !messageType || !messageContent) {
      return { success: false, output: null, error: "Missing required parameters: topicName, messageType, messageContent." };
    }

    try {
      await this.rosService.ensureConnection();
      const message = JSON.parse(messageContent);
      this.rosService.publish(topicName, messageType, message);
      return { success: true, output: `Message published to ${topicName}.` };
    } catch (error: any) {
      return { success: false, output: null, error: `Failed to publish ROS message: ${error.message}` };
    }
  }
}
