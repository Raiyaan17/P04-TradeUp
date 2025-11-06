'use client'
import { useState, useEffect, useRef } from "react";
import TopBar from '@/components/topbar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';

export default function settings() {

    type AuthFormFields = {
        name: string;
        email: string;
        password: string;
        confirm: string;
    };

    const { register, handleSubmit, formState: { errors } } = useForm<AuthFormFields>();
    const [image, setImage] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
            setImage(file);
        }
    };

    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setTimeout(() => {
                    router.push('/');
                }, 150);
            } else {
                setTimeout(() => {
                    setLoading(false);;
                }, 150);
            }
        }
    }, []);

    if (loading) {
        return (
            <div className='min-h-screen bg-[#111418] flex items-center justify-center'>
                <span className='text-white text-xl'>Loading...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111418]">
            <TopBar />
            <div className="flex flex-col items-center">
                <h1 className='font-semibold text-white text-3xl mb-10 p-0 m-0'>Settings</h1>
                <div className="flex justify-center gap-30">
                    <div className='bg-[#181B20] text-white rounded-3xl flex flex-col items-center w-105 h-120 p-9 gap-4'>
                        <h1 className='text-left w-[100%] font-semibold text-white text-2xl mb-5 p-0 m-0'>Profile</h1>
                        <Avatar className="cursor-pointer w-30 h-30" >
                            {image? <AvatarImage src={URL.createObjectURL(image)} className="scale-120 border border-[#23262b]" />
                            :<AvatarFallback className="bg-[#111418] text-white">CN</AvatarFallback>}
                        </Avatar>
                        <p className="font-semibold text-white text-3xl p-0 m-0">john doe</p>
                        <p>johndoe@gmail.com</p>
                        <button className="rounded-lg cursor-pointer bg-[#111418] w-60 h-12 mt-8" onClick={handleButtonClick}>Change Picture</button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className='bg-[#181B20] text-white rounded-3xl flex flex-col w-105 h-120 p-7 '>
                        <h1 className='text-left w-[100%] font-semibold text-white text-2xl mb-5 p-0 m-0'>Account Settings</h1>
                        <p>Full Name</p>
                        <Input {...register('name')} type="text" placeholder="" className="mb-5 border border-[#23262b]" />
                        <p>Email</p>
                        <Input {...register('email')} type="email" placeholder="" className="mb-5 border border-[#23262b]" />
                        <p>Password</p>
                        <Input {...register('password')} type="password" placeholder="" className="mb-5 border border-[#23262b]" />
                        <p>Confirm Password</p>
                        <Input {...register('confirm')} type="password" placeholder="" className="mb-5 border border-[#23262b]" />
                        <div className="flex justify-between">
                            <button className="rounded-lg cursor-pointer bg-[#22c55e] w-40 h-10">Update Info</button>
                            <button className="text-[#ef4444] cursor-pointer mr-6">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}