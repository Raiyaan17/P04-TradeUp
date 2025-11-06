'use client'
import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from "next/navigation";

export default function topBar() {

    const [hidden, setHidden] = useState<string>('none');
    const [url, setUrl] = useState<any>(null);
    const [img, setimg] = useState<any>(null);
    const router = useRouter();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUrl(URL.createObjectURL(file));
        }
    };

    return (
        <div>
            <div className="text-white flex justify-around items-center border-b border-[#23262b] h-25 mb-10">
                <a href="/dashboard"><h1 className="font-semibold text-4xl">Trade Up</h1></a>
                <div className="text-lg flex gap-15 mr-50">
                    <a href="/portfolio">Portfolio</a>
                    <a href="/charts">Markets</a>
                    <a href="/dashboard">Watchlist</a>
                </div>
                <Avatar className="scale-130 cursor-pointer" onClick={() => setHidden('flex')}>
                    <AvatarImage src={img} className="scale-120 border border-[#23262b]" />
                    <AvatarFallback className="bg-[#181B20] text-white">CN</AvatarFallback>
                </Avatar>
            </div>
            <div style={{ display: hidden }} className="text-white rounded-3xl bg-[#181B20] flex flex-col justify-start p-4 items-center gap-4 justify-center absolute top-19 right-10 y-2000 border border-[#23262b] h-65 w-55">
                <div className="flex justify-end w-[100%] mr-10">
                    <CloseIcon className="cursor-pointer" onClick={() => setHidden('none')} />
                </div>
                <Avatar className="scale-130 w-15 h-15" onClick={() => setHidden('flex')}>
                    <AvatarImage src={img} className="scale-120 border border-[#23262b]" />
                    <AvatarFallback className="bg-[#111418] text-white">CN</AvatarFallback>
                </Avatar>
                <Label className="my-5 ">John Doe</Label>
                <div className="flex justify-around w-[100%]">
                    <button className="bg-[#ef4444] w-20 h-7 rounded cursor-pointer" onClick={() => {
                        if (typeof window !== "undefined") {
                            localStorage.removeItem("access_token");
                        }
                        setimg(url);
                        setHidden('none');
                        router.push("/");
                    }}>Sign Out</button>
                    <button className="cursor-pointer" ><a href="/settings">Settings</a></button>
                </div>
            </div>
        </div>


    );
}