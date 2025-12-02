'use client'
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation";
import { getUserProfile, User } from "@/lib/userService";
import { useUser } from "@/context/UserContext";

export default function TopBar() {
    const [hidden, setHidden] = useState<string>('none');
    const { user } = useUser();
    const router = useRouter();

    return (
        <div>
            <div className="text-white flex justify-around items-center border-b border-[#23262b] h-25 mb-10">
                <a href="/dashboard"><h1 className="font-semibold text-4xl">Trade Up</h1></a>
                <div className="text-lg flex gap-15 mr-50">
                    <a href="/portfolio">Portfolio</a>
                    <a href="/charts">Markets</a>
                    <a href="/buy">Trade</a>
                    <a href="/news">News</a>
                </div>
                <Avatar className="scale-130 cursor-pointer" onClick={() => setHidden('flex')}>
                    {user?.profileImageUrl
                                ? <AvatarImage src={user.profileImageUrl} className="scale-120 border border-[#23262b]" />
                                : <AvatarFallback className="bg-[#111418] text-white">
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'CN'}
                    </AvatarFallback>
                    }
                </Avatar>
            </div>
            <div style={{ display: hidden }} className="text-white rounded-3xl bg-[#181B20] flex flex-col justify-start p-4 items-center gap-4 justify-center absolute top-19 right-10 y-2000 border border-[#23262b] h-65 w-55">
                <div className="flex justify-end w-[100%] mr-10">
                    <svg
                        className="cursor-pointer w-6 h-6"
                        onClick={() => setHidden('none')}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <Avatar className="scale-130 w-15 h-15" onClick={() => setHidden('flex')}>
                    {user?.profileImageUrl
                                ? <AvatarImage src={user.profileImageUrl} className="scale-120 border border-[#23262b]" />
                                : <AvatarFallback className="bg-[#111418] text-white">
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'CN'}
                    </AvatarFallback>
                    }
                </Avatar>
                <Label className="my-5">
                    {user?.name || user?.email || 'User'}
                </Label>
                <div className="flex justify-around w-[100%]">
                    <button className="bg-[#ef4444] w-20 h-7 rounded cursor-pointer" onClick={() => {
                        if (typeof window !== "undefined") {
                            localStorage.removeItem("access_token");
                        }
                        setHidden('none');
                        router.push("/");
                    }}>Sign Out</button>
                    <button className="cursor-pointer" ><a href="/settings">Settings</a></button>
                </div>
            </div>
        </div>


    );
}