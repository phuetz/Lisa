import { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomains } from "./types";
import { RosService } from "../services/RosService";

export class RobotAgent implements BaseAgent {
  name = "RobotAgent";
  description = "Manages robot control and interaction.";
  version = "0.1.0";
  domain = AgentDomains.INTEGRATION;
  capabilities = ["move", "turn", "pickUp"];

  private rosService: RosService;

  constructor() {
    // TODO: Make ROS Bridge URL configurable (e.g., via environment variable)
    this.rosService = new RosService(import.meta.env.VITE_ROS_BRIDGE_URL || "ws://localhost:9090"); 
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    try {
      await this.rosService.ensureConnection();

      switch (intent) {
        case "move":
          if (parameters && typeof parameters.distance === "number") {
            return this.move(parameters.distance);
          }
          return { success: false, output: null, error: "Missing or invalid 'distance' parameter for move intent." };
        case "turn":
          if (parameters && typeof parameters.angle === "number") {
            return this.turn(parameters.angle);
          }
          return { success: false, output: null, error: "Missing or invalid 'angle' parameter for turn intent." };
        case "pickUp":
          if (parameters && typeof parameters.objectId === "string") {
            return this.pickUp(parameters.objectId);
          }
          return { success: false, output: null, error: "Missing or invalid 'objectId' parameter for pickUp intent." };
        default:
          return { success: false, output: null, error: `Unknown intent: ${intent}` };
      }
    } catch (error: any) {
      return { success: false, output: null, error: `ROS communication error: ${error.message}` };
    }
  }

  private async move(distance: number): Promise<AgentExecuteResult> {
    console.log(`Robot moving by ${distance} units.`);
    // Example: Publish to a ROS topic for movement
    this.rosService.publish("/cmd_vel", "geometry_msgs/Twist", {
      linear: { x: distance, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    });
    return { success: true, output: `Moved by ${distance} units.` };
  }

  private async turn(angle: number): Promise<AgentExecuteResult> {
    console.log(`Robot turning by ${angle} degrees.`);
    // Example: Publish to a ROS topic for turning
    this.rosService.publish("/cmd_vel", "geometry_msgs/Twist", {
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angle }
    });
    return { success: true, output: `Turned by ${angle} degrees.` };
  }

  private async pickUp(objectId: string): Promise<AgentExecuteResult> {
    console.log(`Robot attempting to pick up object: ${objectId}.`);
    // Example: Call a ROS service for picking up an object
    try {
      const response = await this.rosService.callService("/pick_up_object", "my_robot_msgs/PickUpObject", {
        object_id: objectId
      });
      return { success: true, output: `Attempted to pick up object: ${objectId}. Service response: ${JSON.stringify(response)}` };
    } catch (error: any) {
      return { success: false, output: null, error: `Failed to pick up object: ${error.message}` };
    }
  }
}

