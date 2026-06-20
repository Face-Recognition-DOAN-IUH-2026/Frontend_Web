export interface RemoteRobot {
  id: string;
  userId: string;
  userName: string;
  clientId: string;
  position: [number, number, number];
  rotation: number;
  chatState: "idle" | "thinking" | "responding";
  message: string;
}

export interface PartyMessage {
  type: "init" | "robot:update" | "robot:remove" | "robot:chat-state" | "robot:select";
  robots?: RemoteRobot[];
  robot?: RemoteRobot;
  robotId?: string;
  connectionId?: string;
  chatState?: "idle" | "thinking" | "responding";
  message?: string;
  shelfId?: string;
  bookId?: string;
}