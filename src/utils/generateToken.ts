import jwt from "jsonwebtoken";

interface Payload {
  userId: string;
  role:string;
  suspended:boolean;
}

export const generateAccessToken = (userId: string, role:string,suspended:boolean): string => {
  const payload: Payload = { userId,role,suspended };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "30m",
  });

  return accessToken;
};

export const generateRefreshToken = (userId: string, role:string,suspended:boolean): string => {
  const payload: Payload = { userId,role,suspended };

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: "5h",
    }
  );

  return refreshToken;
};
