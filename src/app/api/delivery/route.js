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

    const deliveries = await prisma.delivery.findMany({
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      { message: "Deliveries fetched successfully", deliveries },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get Deliveries Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch deliveries" },
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
    const { customer, deliveryDate, items } = body;

    if (!customer || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Customer and items are required" },
        { status: 400 }
      );
    }

    const delivery = await prisma.delivery.create({
      data: {
        customer,
        status: "draft",
        items: {
          create: items.map(item => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            warehouseId: Number(item.warehouseId),
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
      },
    });

    return NextResponse.json(
      { message: "Delivery created successfully", delivery },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Delivery Error:", error);
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
    const { deliveryId, status, items } = body;

    if (!deliveryId) {
      return NextResponse.json(
        { message: "Delivery ID is required" },
        { status: 400 }
      );
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: Number(deliveryId) },
      include: {
        items: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { message: "Delivery not found" },
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
        const deliveryItem = delivery.items.find(di => di.id === item.deliveryItemId);
        if (!deliveryItem) {
          return NextResponse.json(
            { message: `Delivery item ${item.deliveryItemId} not found` },
            { status: 404 }
          );
        }

        const deliveredQty = Number(item.deliveredQty);
        if (deliveredQty < 0 || deliveredQty > deliveryItem.quantity) {
          return NextResponse.json(
            { message: `Invalid delivered quantity for item ${item.deliveryItemId}` },
            { status: 400 }
          );
        }

        if (deliveredQty > 0) {
          const stock = await prisma.stock.findUnique({
            where: {
              productId_warehouseId: {
                productId: deliveryItem.productId,
                warehouseId: deliveryItem.warehouseId,
              },
            },
          });

          if (!stock || stock.quantity < deliveredQty) {
            return NextResponse.json(
              { message: `Insufficient stock for product ${deliveryItem.productId}` },
              { status: 400 }
            );
          }

          await prisma.stock.update({
            where: {
              productId_warehouseId: {
                productId: deliveryItem.productId,
                warehouseId: deliveryItem.warehouseId,
              },
            },
            data: {
              quantity: { decrement: deliveredQty },
            },
          });
        }
      }
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id: Number(deliveryId) },
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
      },
    });

    return NextResponse.json(
      { message: "Delivery updated successfully", delivery: updatedDelivery },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Delivery Error:", error);
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
