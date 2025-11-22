import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(body.password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Incorrect password" },
        { status: 400 }
      );
    }

    const tokenBody = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(tokenBody, process.env.JWT_SECRET || "default-secret-key", {
      expiresIn: "1d",
    });

    const res = NextResponse.json(
      { message: "Login successful", role: user.role },
      { status: 200 }
    );

    res.cookies.set(
      "mylogintoken",
      JSON.stringify({
        token,
        role: user.role,
      }),
      {
        httpOnly: false,
        path: "/",
      }
    );

    return res;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
