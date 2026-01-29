export type Session = {
  session: {
    id: "string";
    expiresAt: "string";
    token: "string";
    createdAt: "Generated at runtime";
    updatedAt: "string";
    ipAddress: "string";
    userAgent: "string";
    userId: "string";
  };
  user: {
    id: "string";
    name: "string";
    email: "string";
    emailVerified: false;
    image: "string";
    createdAt: "Generated at runtime";
    updatedAt: "Generated at runtime";
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
};
