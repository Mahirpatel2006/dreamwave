import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getAuthToken(req) {
  try {
    const tokenCookie = req.cookies?.get("mylogintoken")?.value;
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

    const transfers = await prisma.transfer.findMany({
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
        fromWarehouse: true,
        toWarehouse: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      { message: "Transfers fetched successfully", transfers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get Transfers Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch transfers" },
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
    const { fromWarehouseId, toWarehouseId, items } = body;

    if (!fromWarehouseId || !toWarehouseId || !items || items.length === 0) {
      return NextResponse.json(
        { message: "From warehouse, to warehouse, and items are required" },
        { status: 400 }
      );
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { message: "Source and destination warehouses must be different" },
        { status: 400 }
      );
    }

    const fromWarehouse = await prisma.warehouse.findUnique({
      where: { id: Number(fromWarehouseId) },
    });

    const toWarehouse = await prisma.warehouse.findUnique({
      where: { id: Number(toWarehouseId) },
    });

    if (!fromWarehouse || !toWarehouse) {
      return NextResponse.json(
        { message: "One or both warehouses not found" },
        { status: 404 }
      );
    }

    const transfer = await prisma.transfer.create({
      data: {
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        status: "draft",
        items: {
          create: items.map(item => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            transferredQty: 0,
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
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    return NextResponse.json(
      { message: "Transfer created successfully", transfer },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Transfer Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create transfer" },
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
    const { transferId, status, items } = body;

    if (!transferId) {
      return NextResponse.json(
        { message: "Transfer ID is required" },
        { status: 400 }
      );
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id: Number(transferId) },
      include: {
        items: true,
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { message: "Transfer not found" },
        { status: 404 }
      );
    }

    if (status === "completed") {
      if (!items || items.length === 0) {
        return NextResponse.json(
          { message: "Items with quantities are required for completion" },
          { status: 400 }
        );
      }

      for (const item of items) {
        const transferItem = transfer.items.find(ti => ti.id === item.transferItemId);
        if (!transferItem) {
          return NextResponse.json(
            { message: `Transfer item ${item.transferItemId} not found` },
            { status: 404 }
          );
        }

        const transferredQty = Number(item.transferredQty);
        if (transferredQty < 0 || transferredQty > transferItem.quantity) {
          return NextResponse.json(
            { message: `Invalid transferred quantity for item ${item.transferItemId}` },
            { status: 400 }
          );
        }

        if (transferredQty > 0) {
          const sourceStock = await prisma.stock.findUnique({
            where: {
              productId_warehouseId: {
                productId: transferItem.productId,
                warehouseId: transfer.fromWarehouseId,
              },
            },
          });

          if (!sourceStock || sourceStock.quantity < transferredQty) {
            return NextResponse.json(
              { message: `Insufficient stock for product ${transferItem.productId} in source warehouse` },
              { status: 400 }
            );
          }

          await prisma.stock.update({
            where: {
              productId_warehouseId: {
                productId: transferItem.productId,
                warehouseId: transfer.fromWarehouseId,
              },
            },
            data: {
              quantity: { decrement: transferredQty },
            },
          });

          await prisma.stock.upsert({
            where: {
              productId_warehouseId: {
                productId: transferItem.productId,
                warehouseId: transfer.toWarehouseId,
              },
            },
            update: {
              quantity: { increment: transferredQty },
            },
            create: {
              productId: transferItem.productId,
              warehouseId: transfer.toWarehouseId,
              quantity: transferredQty,
            },
          });
        }

        await prisma.transferItem.update({
          where: { id: item.transferItemId },
          data: { transferredQty },
        });
      }
    }

    const updatedTransfer = await prisma.transfer.update({
      where: { id: Number(transferId) },
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
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    return NextResponse.json(
      { message: "Transfer updated successfully", transfer: updatedTransfer },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Transfer Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update transfer" },
      { status: 500 }
    );
  }
}
