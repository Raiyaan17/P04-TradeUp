'use client'
import { useState, useEffect, useRef } from "react";
import TopBar from '@/components/topbar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { getUserProfile, User, updateUserName, updateUserEmail, updateUserPassword } from "@/lib/userService";

export default function Settings() {

    type AuthFormFields = {
        name: string;
        email: string;
        password: string;
        confirm: string;
    };

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<AuthFormFields>();
    const [image, setImage] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [user,setUser] = useState<User | null>(null);
    const handleButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    async function changeData(data: AuthFormFields) {
        try {
            // Validate that current password is provided if any changes are being made
            if (!data.confirm && (data.name !== user?.name || data.email !== user?.email || data.password)) {
                return;
            }

            // Update name if changed
            if (data.name && data.name !== user?.name) {
                await updateUserName(data.name, data.confirm);
            }

            // Update email if changed
            if (data.email && data.email !== user?.email) {
                await updateUserEmail(data.email, data.confirm);
            }

            // Update password if new password is provided
            if (data.password) {
                await updateUserPassword(data.confirm, data.password);
            }

            // Refresh user profile
            const updatedProfile = await getUserProfile();
            setUser(updatedProfile);
            // Update form values with new profile data
            setValue('name', updatedProfile.name || '');
            setValue('email', updatedProfile.email || '');
            setValue('password', '');
            setValue('confirm', '');

        } catch (error: unknown) {
            console.error('Failed to update profile:', error);
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImage(file);
        }
    };

    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setTimeout(() => {
                    router.push('/');
                }, 150);
                return;
            }
            
            try {
                const profile = await getUserProfile();
                setUser(profile);
                // Set form values when profile is loaded
                setValue('name', profile.name || '');
                setValue('email', profile.email || '');
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                // If token is expired or invalid, redirect to login
                router.push('/');
            } finally {
                setTimeout(() => {
                    setLoading(false);
                }, 150);
            }
        }
    };

    fetchUserProfile();
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
                        <p className="font-semibold text-white text-3xl p-0 m-0">{user?.name || ''}</p>
                        <p>{user?.email || ''}</p>
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
                        <div className="mb-3">
                            <p>Full Name</p>
                            <Input 
                                {...register('name')} 
                                type="text" 
                                placeholder="" 
                                className="border border-[#23262b]" 
                            />
                        </div>
                        <div className="mb-3">
                            <p>Email</p>
                            <Input 
                                {...register('email', {
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: "Please enter a valid email address.",
                                    },
                                })} 
                                type="email" 
                                placeholder="" 
                                className="border border-[#23262b]" 
                            />
                            {errors.email && (
                                <span className="text-red-500 text-xs mt-1">
                                    {errors.email.message}
                                </span>
                            )}
                        </div>
                        <div className="mb-3">
                            <p>New Password</p>
                            <Input 
                                {...register('password', {
                                    minLength: {
                                        value: 8,
                                        message: "Password should be at least 8 characters long",
                                    },
                                })} 
                                type="password" 
                                placeholder="" 
                                className="border border-[#23262b]" 
                            />
                            {errors.password && (
                                <span className="text-red-500 text-xs mt-1">
                                    {errors.password.message}
                                </span>
                            )}
                        </div>
                        <div className="mb-5">
                            <p>Current Password</p>
                            <Input 
                                {...register('confirm')} 
                                type="password" 
                                placeholder="" 
                                className="border border-[#23262b]" 
                            />
                        </div>
                        <div className="flex justify-between">
                            <button onClick={handleSubmit(changeData)} className="rounded-lg cursor-pointer bg-[#22c55e] w-40 h-10">Update Info</button>
                            <button className="text-[#ef4444] cursor-pointer mr-6">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}