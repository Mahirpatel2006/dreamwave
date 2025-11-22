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
    const { name, sku, uom, category, quantity, warehouseId } = body;

    if (!name || !sku || !uom) {
      return NextResponse.json(
        { message: "Name, SKU, and Unit of Measure are required" },
        { status: 400 }
      );
    }

    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      return NextResponse.json(
        { message: "SKU already exists" },
        { status: 400 }
      );
    }

    let categoryId = null;
    if (category && category.trim()) {
      const categoryObj = await prisma.category.findFirst({
        where: {
          name: {
            equals: category.trim(),
            mode: "insensitive",
          },
        },
      });

      if (categoryObj) {
        categoryId = categoryObj.id;
      } else {
        const newCategory = await prisma.category.create({
          data: { name: category.trim() },
        });
        categoryId = newCategory.id;
      }
    } else {
      const defaultCategory = await prisma.category.findFirst({
        where: { name: "Uncategorized" },
      });

      if (defaultCategory) {
        categoryId = defaultCategory.id;
      } else {
        const newCategory = await prisma.category.create({
          data: { name: "Uncategorized" },
        });
        categoryId = newCategory.id;
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        uom,
        categoryId,
      },
      include: {
        category: true,
        stocks: true,
      },
    });

    if (quantity && quantity > 0 && warehouseId) {
      await prisma.stock.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: Number(warehouseId),
          },
        },
        update: {
          quantity: Number(quantity),
        },
        create: {
          productId: product.id,
          warehouseId: Number(warehouseId),
          quantity: Number(quantity),
        },
      });
    }

    return NextResponse.json(
      { message: "Product created successfully", product },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add Product Error:", error);
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
