import type * as Party from "partykit/server";

interface RobotState {
  id: string;
  userId: string;
  userName: string;
  clientId: string;
  position: [number, number, number];
  rotation: number;
  chatState: "idle" | "thinking" | "responding";
  message: string;
  timestamp: number;
}

export default class AICenterParty implements Party.Server {
  robots: Map<string, RobotState> = new Map();

  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const existingRobots = Array.from(this.robots.values());
    conn.send(
      JSON.stringify({
        type: "init",
        robots: existingRobots,
        connectionId: conn.id,
      })
    );
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "robot:move": {
          const robotState: RobotState = {
            id: sender.id,
            userId: data.userId,
            userName: data.userName,
            clientId: data.clientId,
            position: data.position,
            rotation: data.rotation,
            chatState: data.chatState || "idle",
            message: data.message || "",
            timestamp: Date.now(),
          };

          this.robots.set(sender.id, robotState);

          this.room.broadcast(
            JSON.stringify({
              type: "robot:update",
              robot: robotState,
            }),
            [sender.id]
          );
          break;
        }

        case "robot:chat-state": {
          const robot = this.robots.get(sender.id);
          if (robot) {
            robot.chatState = data.chatState;
            robot.message = data.message || "";
            robot.timestamp = Date.now();

            this.room.broadcast(
              JSON.stringify({
                type: "robot:chat-state",
                robotId: sender.id,
                chatState: data.chatState,
                message: data.message,
              }),
              [sender.id]
            );
          }
          break;
        }

        case "robot:select": {
          const robot = this.robots.get(sender.id);
          if (robot) {
            robot.timestamp = Date.now();

            this.room.broadcast(
              JSON.stringify({
                type: "robot:select",
                robotId: sender.id,
                shelfId: data.shelfId,
                bookId: data.bookId,
              }),
              [sender.id]
            );
          }
          break;
        }
      }
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  }

  async onClose(conn: Party.Connection) {
    const robot = this.robots.get(conn.id);
    if (robot) {
      this.robots.delete(conn.id);
      this.room.broadcast(
        JSON.stringify({
          type: "robot:remove",
          robotId: conn.id,
        })
      );
    }
  }
}