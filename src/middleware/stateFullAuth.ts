import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./ErrorHandler";
import { publicKey } from "../utils/jwtKeys";
import prisma from "../utils/Prisma";
import customerLogger from "../log/logger";

export const stateFullAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { authorization } = req.headers;

    if (!authorization) {
      throw new AppError(
        req.t("authorizationIsRequired"),
        "Unauthorized",
        401,
        req.path,
        null
      );
    }

    const token = authorization.split(" ")[1];

    req.user = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    });
    const user = await prisma.user.findUnique({
      where: {
        email: req.user.email,
      },
    });
    if (!user || user?.jwt_Signature !== token.split(".")[2]) {
      throw new AppError(
        req.t("invalidToken"),
        "Unauthorized",
        400,
        req.path,
        null
      );
    }
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        errors: [
          {
            message: error.message,
            type: error.type,
            path: error.path,
            value: error.value,
          },
        ],
      });
    }
    return (
      customerLogger.log("error", error),
      res.status(500).json({
        errors: [
          {
            message: "Something went wrong. Try again later.",
            type: "server Error",
            path: req.path,
            value: null,
          },
        ],
      })
    );
  }
};
