import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getAuthToken(req) {
  try {
    const tokenCookie = req.cookies?.get('mylogintoken')?.value;
    if (!tokenCookie) {
      return null;
    }
    return JSON.parse(tokenCookie);
  } catch (error) {
    console.error("Failed to parse auth token:", error);
    return null;
  }
}

export async function GET(req) {
  try {
    const user = getAuthToken(req);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const warehouses = await prisma.warehouse.findMany({
      include: {
        stocks: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(
      { message: "Warehouses fetched successfully", warehouses },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get Warehouses Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = getAuthToken(req);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Warehouse name is required" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: { name },
    });

    return NextResponse.json(
      { message: "Warehouse created successfully", warehouse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Warehouse Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create warehouse" },
      { status: 500 }
    );
  }
}
