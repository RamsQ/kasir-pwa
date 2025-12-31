import React from 'react';
import DashboardLayout from "@/Layouts/DashboardLayout"; // Sesuaikan dengan Dashboard Anda
import { Head } from '@inertiajs/react';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import { IconUser, IconLock, IconSettings } from '@tabler/icons-react';

export default function Index({ auth }) {
    return (
        <>
            <Head title="Profil Saya" />

            <div className="space-y-6">
                {/* Header Page */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
                            Pengaturan Profil
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Kelola informasi akun dan keamanan kata sandi Anda
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Sisi Kiri: Update Info & Foto */}
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <div className="p-6 sm:p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600">
                                        <IconUser size={22} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase">
                                        Informasi Akun
                                    </h3>
                                </div>
                                <UpdateProfileInformationForm />
                            </div>
                        </div>
                    </div>

                    {/* Sisi Kanan: Keamanan Password */}
                    <div className="lg:col-span-4">
                        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <div className="p-6 sm:p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                        <IconLock size={22} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase">
                                        Keamanan
                                    </h3>
                                </div>
                                <UpdatePasswordForm />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

// BARIS INI YANG MEMUNCULKAN SIDEBAR
Index.layout = (page) => <DashboardLayout children={page} />;