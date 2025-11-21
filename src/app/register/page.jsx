"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
const Page = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
   
  });
const router = useRouter();
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const register = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/register", form);
      alert("User registered successfully");
      console.log("all done");
      router.push("/");
      
      console.log(res);
    } catch (error) {
      console.log("Error while sending data", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Register User
        </h2>

        <form onSubmit={register} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Name</label>
            <input
              type="text"
              name="name"
              onChange={handleChange}
              value={form.name}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Enter name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Email</label>
            <input
              type="email"
              name="email"
              onChange={handleChange}
              value={form.email}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="example@gmail.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Password
            </label>
            <input
              type="password"
              name="password"
              onChange={handleChange}
              value={form.password}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Enter password"
            />
          </div>

          

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Page;
