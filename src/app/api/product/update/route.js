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

export async function PUT(req) {
  try {
    const user = getAuthToken(req);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, name, sku, uom, category } = body;

    if (!id) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 }
      );
    }

    let categoryId = undefined;
    if (category !== undefined) {
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
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(uom && { uom }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      { message: "Product updated successfully", product: updatedProduct },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Product Error:", error);
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
