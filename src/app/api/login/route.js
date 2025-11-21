import jwt from "jsonwebtoken"  ;
import { NextResponse , NextRequest } from "next/server";
import prisma from "@/lib/prisma";




export async function POST(req){
try {
    const body = await req.json();
    const user =  await prisma.user.findUnique({where:{email:body.email}})

    if(!user){
        return NextResponse.json({error:"User not found"},{status:400})
    }
    if(user.password!==body.password){
        return NextResponse.json({error:"Incorrect password"},{status:400})
    }
    const tokkenbody = {
        id:user.id,
        email:user.email,
        role:user.role
    }
    const token = await jwt.sign(tokkenbody,"iamlazzzzy",{expiresIn:"1d"});
const creq = NextResponse.json({Role:user.role},{status:200})
creq.cookies.set("mylogintoken", JSON.stringify({
  token, 
  role: user.role
}), { httpOnly: false });return creq
    
} catch (error) {
   return NextResponse.json({error},{status:500}) 
}
}
    
