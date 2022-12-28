export interface RequestWithUser {
  user: {
    userId: string;
  };
}

export interface RequestWithOptionalUser {
  user?: {
    userId: string;
  };
}
