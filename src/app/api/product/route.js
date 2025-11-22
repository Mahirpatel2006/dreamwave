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

    const products = await prisma.product.findMany({
      include: {
        category: true,
        stocks: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(
      { message: "Products fetched successfully", products },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get Products Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = getAuthToken(req);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 }
      );
    }

    const productId = Number(id);

    await prisma.$transaction([
      prisma.stock.deleteMany({
        where: { productId },
      }),
      prisma.receiptItem.deleteMany({
        where: { productId },
      }),
      prisma.deliveryItem.deleteMany({
        where: { productId },
      }),
      prisma.transferItem.deleteMany({
        where: { productId },
      }),
      prisma.product.delete({
        where: { id: productId },
      }),
    ]);

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Product Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}
