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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause = status ? { status } : {};

    const receipts = await prisma.receipt.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        warehouse: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      { message: "Receipts fetched successfully", receipts },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get Receipts Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch receipts" },
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
    const { supplier, warehouseId, receiptDate, items } = body;

    if (!supplier || !warehouseId || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Supplier, warehouse, and items are required" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: Number(warehouseId) },
    });

    if (!warehouse) {
      return NextResponse.json(
        { message: "Warehouse not found" },
        { status: 404 }
      );
    }

    const receipt = await prisma.receipt.create({
      data: {
        supplier,
        warehouseId: Number(warehouseId),
        receiptDate: new Date(receiptDate),
        status: "draft",
        items: {
          create: items.map(item => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            receivedQty: 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        warehouse: true,
      },
    });

    return NextResponse.json(
      { message: "Receipt created successfully", receipt },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Receipt Error:", error);
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const user = getAuthToken(req);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { receiptId, status, items } = body;

    if (!receiptId) {
      return NextResponse.json(
        { message: "Receipt ID is required" },
        { status: 400 }
      );
    }

    const receipt = await prisma.receipt.findUnique({
      where: { id: Number(receiptId) },
      include: {
        items: true,
        warehouse: true,
      },
    });

    if (!receipt) {
      return NextResponse.json(
        { message: "Receipt not found" },
        { status: 404 }
      );
    }

    if (status === "validated") {
      if (!items || items.length === 0) {
        return NextResponse.json(
          { message: "Items with quantities are required for validation" },
          { status: 400 }
        );
      }

      for (const item of items) {
        const receiptItem = receipt.items.find(ri => ri.id === item.receiptItemId);
        if (!receiptItem) {
          return NextResponse.json(
            { message: `Receipt item ${item.receiptItemId} not found` },
            { status: 404 }
          );
        }

        const receivedQty = Number(item.receivedQty);
        if (receivedQty < 0 || receivedQty > receiptItem.quantity) {
          return NextResponse.json(
            { message: `Invalid received quantity for item ${item.receiptItemId}` },
            { status: 400 }
          );
        }

        await prisma.receiptItem.update({
          where: { id: item.receiptItemId },
          data: { receivedQty },
        });

        if (receivedQty > 0) {
          await prisma.stock.upsert({
            where: {
              productId_warehouseId: {
                productId: receiptItem.productId,
                warehouseId: receipt.warehouseId,
              },
            },
            update: {
              quantity: { increment: receivedQty },
            },
            create: {
              productId: receiptItem.productId,
              warehouseId: receipt.warehouseId,
              quantity: receivedQty,
            },
          });
        }
      }
    }

    const updatedReceipt = await prisma.receipt.update({
      where: { id: Number(receiptId) },
      data: { status: status || "draft" },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        warehouse: true,
      },
    });

    return NextResponse.json(
      { message: "Receipt updated successfully", receipt: updatedReceipt },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Receipt Error:", error);
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
