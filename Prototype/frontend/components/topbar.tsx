'use client'
import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from "next/navigation";
import { getUserProfile, User } from "@/lib/userService";

export default function TopBar() {

    const [hidden, setHidden] = useState<string>('none');
    const [url, setUrl] = useState<string | null>(null);
    const [img, setimg] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    // Fetch user profile on component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    // No token, redirect to login
                    router.push('/');
                    return;
                }

                const userProfile = await getUserProfile();
                setUser(userProfile);
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                // If token is expired or invalid, redirect to login
                if (error instanceof Error && error.message === 'Authentication expired') {
                    router.push('/');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [router]);

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
                    <a href="/buy">Trade</a>
                </div>
                <Avatar className="scale-130 cursor-pointer" onClick={() => setHidden('flex')}>
                    <AvatarImage src={img} className="scale-120 border border-[#23262b]" />
                    <AvatarFallback className="bg-[#181B20] text-white">
                        {loading ? 'LO' : user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'CN'}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div style={{ display: hidden }} className="text-white rounded-3xl bg-[#181B20] flex flex-col justify-start p-4 items-center gap-4 justify-center absolute top-19 right-10 y-2000 border border-[#23262b] h-65 w-55">
                <div className="flex justify-end w-[100%] mr-10">
                    <CloseIcon className="cursor-pointer" onClick={() => setHidden('none')} />
                </div>
                <Avatar className="scale-130 w-15 h-15" onClick={() => setHidden('flex')}>
                    <AvatarImage src={img} className="scale-120 border border-[#23262b]" />
                    <AvatarFallback className="bg-[#111418] text-white">
                        {loading ? 'LO' : user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'CN'}
                    </AvatarFallback>
                </Avatar>
                <Label className="my-5">
                    {loading ? 'Loading...' : user?.name || user?.email || 'User'}
                </Label>
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