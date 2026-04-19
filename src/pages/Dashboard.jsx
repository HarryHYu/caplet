import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CoursesContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import {
    BookOpenIcon,
    AcademicCapIcon,
    FireIcon,
    ArrowRightIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
    const { user } = useAuth();
    const { courses, loading: coursesLoading, hasFetched, fetchCourses } = useCourses();
    const [userProgress, setUserProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        if (!hasFetched && !coursesLoading) {
            fetchCourses().catch(() => {
                // Sidebar can render without courses when unavailable.
            });
        }
    }, [coursesLoading, fetchCourses, hasFetched]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [progressData, classesData] = await Promise.all([
                    api.getUserProgress(),
                    api.getClasses(),
                ]);
                // /progress returns { progress: [...] }
                setUserProgress(progressData?.progress || []);
                // /classes returns { teaching: [...], student: [...] }
                const allClasses = [
                    ...(classesData?.teaching || []),
                    ...(classesData?.student || [])
                ];
                setClasses(allClasses);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading || coursesLoading) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center">
                <CapletLoader message="Loading your dashboard…" />
            </div>
        );
    }

    const inProgressCourses = userProgress?.filter(p => p.status === 'in_progress') || [];
    const completedCourses = userProgress?.filter(p => p.status === 'completed') || [];
    const lastAccessed = userProgress?.sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt))[0];
    const lastAccessedCourse = lastAccessed ? courses.find(c => c.id === lastAccessed.courseId) : null;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good morning';
        if (hour >= 12 && hour < 18) return 'Good afternoon';
        return 'Good evening';
    };


    return (
        <div className="min-h-screen bg-surface-body pt-48 pb-20 selection:bg-accent selection:text-white">
            <div className="container-custom">
                {/* Header Section */}
                <header className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12 reveal-text">
                    <div>
                        <span className="section-kicker">Welcome back</span>
                        <h1 className="text-5xl md:text-7xl">
                            {getGreeting()}, {user?.firstName || 'Student'}.
                        </h1>
                        <p className="mt-8 text-xl text-text-muted font-medium max-w-xl">
                            Great to see you again. You have {inProgressCourses.length} active courses in progress.
                        </p>
                    </div>

                </header>

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-line-soft border border-line-soft mb-24 reveal-text stagger-1">
                    {[
                        { label: 'Modules Active', value: inProgressCourses.length, icon: BookOpenIcon },
                        { label: 'Completed', value: completedCourses.length, icon: CheckCircleIcon },
                        { label: 'Academy Classes', value: classes.length, icon: AcademicCapIcon },
                        { label: 'Activity Index', value: 'High', icon: FireIcon }
                    ].map((stat) => (
                        <div key={stat.label} className="bg-surface-body p-10 group hover:bg-surface-raised transition-colors">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-8 flex justify-between items-center group-hover:text-accent transition-colors">
                                {stat.label}
                                <stat.icon className="w-4 h-4 opacity-20" />
                            </p>
                            <p className="text-5xl font-serif italic text-text-primary group-hover:translate-x-2 transition-transform duration-500">
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                    {/* Main Feed */}
                    <div className="lg:col-span-8 space-y-20">
                        {/* Resume Session */}
                        {lastAccessed && lastAccessedCourse && (
                            <div className="reveal-text stagger-2">
                                <span className="section-kicker">Continue Learning</span>
                                <div className="mt-8 group relative overflow-hidden bg-surface-raised border border-line-soft p-12 transition-all hover:shadow-2xl">
                                    <div className="flex flex-col md:flex-row gap-12 items-center">
                                        <div className="w-40 h-40 shrink-0 bg-surface-soft p-1 border border-line-soft">
                                            <img
                                                src={lastAccessedCourse.thumbnail || 'https://placehold.co/400x400'}
                                                alt=""
                                                className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-4xl font-serif italic mb-6">{lastAccessedCourse.title}</h3>
                                            <div className="w-full bg-surface-soft h-1 mb-8 overflow-hidden">
                                                <div
                                                    className="bg-accent h-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${lastAccessed.progressPercentage}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Progress: {lastAccessed.progressPercentage}%</span>
                                                <Link to={`/courses/${lastAccessedCourse.id}`} className="btn-primary py-3 px-8 text-[15px]">
                                                    Continue Module
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Academy Enrollments */}
                        <div className="reveal-text stagger-3">
                            <div className="flex items-end justify-between mb-8">
                                <div>
                                    <span className="section-kicker">Academy</span>
                                    <h2 className="text-4xl font-serif italic">My Classes.</h2>
                                </div>
                                <Link to="/classes" className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-accent pb-1">All Classes</Link>
                            </div>
                            <div className="grid grid-cols-1 gap-px bg-line-soft border border-line-soft">
                                {classes.length > 0 ? (
                                    classes.slice(0, 3).map(cls => (
                                        <Link key={cls.id} to={`/classes/${cls.id}`} className="bg-surface-body p-8 flex justify-between items-center group hover:bg-surface-raised transition-colors">
                                            <div>
                                                <p className="text-lg font-bold uppercase tracking-tight group-hover:text-accent transition-colors">{cls.name}</p>
                                                <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mt-1">{cls.code}</p>
                                            </div>
                                            <ArrowRightIcon className="w-5 h-5 text-text-dim group-hover:translate-x-2 transition-transform" />
                                        </Link>
                                    ))
                                ) : (
                                    <div className="bg-surface-body p-12 text-center text-text-dim uppercase tracking-widest text-[10px] font-bold italic">
                                        No active enrollments detected.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-20">
                        <div className="reveal-text stagger-3">
                            <span className="section-kicker">My Courses</span>
                            <div className="mt-8 space-y-6">
                                {courses.slice(0, 4).map(course => (
                                    <Link
                                        key={course.id}
                                        to={`/courses/${course.id}`}
                                        className="group flex w-full items-center justify-between gap-4 border border-line-soft bg-surface-body px-5 py-4 hover:bg-surface-raised transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-widest truncate group-hover:text-accent transition-colors">{course.title}</p>
                                            <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mt-1">{course.duration}m Duration</p>
                                        </div>
                                        <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-dim group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="bg-surface-inverse p-12 text-surface-body relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-10 grid-technical !bg-[size:40px_40px]" />
                            <div className="relative z-10">
                                <FireIcon className="w-10 h-10 text-accent mb-8" />
                                <h4 className="text-xl font-serif italic mb-6">Daily Insight</h4>
                                <blockquote className="text-sm font-medium leading-relaxed text-zinc-400 mb-8 italic">
                                    "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it."
                                </blockquote>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-accent">Source: Albert Einstein</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
