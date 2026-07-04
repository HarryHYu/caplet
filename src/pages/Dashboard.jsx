import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CoursesContext';
import { useReveal } from '../lib/useReveal';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import {
    BookOpenIcon,
    AcademicCapIcon,
    FireIcon,
    ArrowRightIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    BookmarkIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
    const { user } = useAuth();
    const { courses, loading: coursesLoading, hasFetched, fetchCourses } = useCourses();
    const [userProgress, setUserProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [savedSlides, setSavedSlides] = useState([]);
    const [dueCount, setDueCount] = useState(0);

    useReveal(undefined, [loading, coursesLoading]);

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
                const [progressData, classesData, savedSlidesData, dueData] = await Promise.all([
                    api.getUserProgress(),
                    api.getClasses(),
                    api.getSavedSlides().catch(() => null),
                    api.getDueReviewItems().catch(() => null),
                ]);
                setUserProgress(progressData?.progress || []);
                const allClasses = [
                    ...(classesData?.teaching || []),
                    ...(classesData?.student || [])
                ];
                setClasses(allClasses);
                setSavedSlides(savedSlidesData?.savedSlides || []);
                setDueCount(dueData?.items?.length || 0);
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

    // Compute real course progress percentage from local lesson data (no extra API call needed).
    const lastCourseAllLessons = (lastAccessedCourse?.modules || []).flatMap(m => m.lessons || []);
    const lastCourseCompleted = userProgress.filter(
        p => String(p.courseId) === String(lastAccessedCourse?.id) && p.status === 'completed' && p.lessonId
    ).length;
    const lastCoursePct = lastCourseAllLessons.length > 0
        ? Math.round((lastCourseCompleted / lastCourseAllLessons.length) * 100)
        : 0;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good morning';
        if (hour >= 12 && hour < 18) return 'Good afternoon';
        return 'Good evening';
    };


    return (
        <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
            <div className="container-custom">
                {/* Header Section */}
                <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-12 reveal">
                    <div>
                        <span className="font-hand text-2xl text-blue -rotate-2 inline-block mb-2">welcome back</span>
                        <h1 className="font-display font-extrabold tracking-tight text-text-primary text-5xl md:text-7xl leading-[0.96]">
                            {getGreeting()}, {user?.firstName || 'Student'}.
                        </h1>
                        <p className="mt-7 text-xl text-text-muted font-medium max-w-xl">
                            Great to see you again. You have {inProgressCourses.length} active {inProgressCourses.length === 1 ? 'course' : 'courses'} in progress.
                        </p>
                    </div>

                </header>

                {/* Due for review — the day's spaced-repetition nudge; only shown when something is actually due */}
                {dueCount > 0 && (
                    <Link
                        to="/revision"
                        className="reveal group mb-20 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between block-amber rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200"
                    >
                        <div className="flex items-center gap-5">
                            <span className="grid place-items-center w-14 h-14 shrink-0 rounded-2xl bg-surface-raised shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)]">
                                <ArrowPathIcon className="w-7 h-7 text-accent" />
                            </span>
                            <div>
                                <p className="font-display font-extrabold tracking-tight text-2xl md:text-3xl text-text-primary leading-tight">
                                    {dueCount} {dueCount === 1 ? 'item' : 'items'} due for review today
                                </p>
                                <p className="text-sm font-bold text-text-muted mt-1.5">
                                    A few minutes of spaced review keeps it from fading.
                                </p>
                            </div>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-white group-hover:bg-accent-strong transition-colors">
                            Review now
                            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </Link>
                )}

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-20 reveal-stagger">
                    {[
                        { label: 'Modules Active', value: inProgressCourses.length, icon: BookOpenIcon, block: 'block-blue' },
                        { label: 'Completed', value: completedCourses.length, icon: CheckCircleIcon, block: 'block-green' },
                        { label: 'Academy Classes', value: classes.length, icon: AcademicCapIcon, block: 'block-amber' },
                        { label: 'Saved Slides', value: savedSlides.length, icon: BookmarkIcon, block: 'block-cream' }
                    ].map((stat) => (
                        <div key={stat.label} className={`${stat.block} rounded-3xl p-8 group shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200`}>
                            <p className="text-sm font-bold text-text-muted mb-6 flex justify-between items-center">
                                {stat.label}
                                <stat.icon className="w-5 h-5 text-accent opacity-70" />
                            </p>
                            <p className="font-display font-extrabold tracking-tight text-5xl text-text-primary">
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
                            <div className="reveal">
                                <span className="section-kicker">Continue Learning</span>
                                <div className="mt-6 group relative overflow-hidden block-blue rounded-3xl p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200">
                                    <div className="flex flex-col md:flex-row gap-10 items-center">
                                        <div className="w-40 h-40 shrink-0 rounded-2xl overflow-hidden bg-surface-raised shadow-[0_16px_36px_-24px_rgba(20,20,18,0.4)]">
                                            <img
                                                src={lastAccessedCourse.thumbnail || 'https://placehold.co/400x400'}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <h3 className="font-display font-bold tracking-tight text-3xl md:text-4xl text-text-primary mb-6">{lastAccessedCourse.title}</h3>
                                            <div className="w-full bg-surface-raised h-2 rounded-full mb-7 overflow-hidden">
                                                <div
                                                    className="bg-accent h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${lastCoursePct}%` }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-4 justify-between items-center">
                                                <span className="text-sm font-bold text-text-muted">Progress: {lastCoursePct}%</span>
                                                <Link to={`/courses/${lastAccessedCourse.id}`} className="btn-primary py-3 px-8 text-[15px]">
                                                    Continue Course
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Academy Enrollments */}
                        <div className="reveal">
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <span className="section-kicker">Academy</span>
                                    <h2 className="font-display font-bold tracking-tight text-3xl md:text-4xl text-text-primary">My Classes</h2>
                                </div>
                                <Link to="/classes" className="text-sm font-bold text-accent hover:-translate-y-0.5 transition-transform">View All Classes</Link>
                            </div>
                            <div className="reveal-stagger grid grid-cols-1 gap-4">
                                {classes.length > 0 ? (
                                    classes.slice(0, 3).map(cls => (
                                        <Link key={cls.id} to={`/classes/${cls.id}`} className="bg-surface-raised rounded-2xl p-7 flex justify-between items-center group shadow-[0_18px_40px_-32px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200">
                                            <div>
                                                <p className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">{cls.name}</p>
                                                <p className="text-xs font-bold text-text-muted mt-1">{cls.code}</p>
                                            </div>
                                            <ArrowRightIcon className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    ))
                                ) : (
                                    <div className="block-cream rounded-2xl p-12 text-center shadow-[0_18px_40px_-32px_rgba(20,20,18,0.3)]">
                                        <p className="text-base font-bold text-text-primary mb-2">No classes yet</p>
                                        <p className="text-sm font-medium text-text-muted">Join or create a class to see it here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-20">
                        <div className="reveal">
                            <span className="section-kicker">My Courses</span>
                            <div className="mt-6 reveal-stagger space-y-4">
                                {courses.slice(0, 4).map(course => (
                                    <Link
                                        key={course.id}
                                        to={`/courses/${course.id}`}
                                        className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-surface-raised px-5 py-4 shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">{course.title}</p>
                                            <p className="text-xs font-bold text-text-muted mt-1">{course.duration}m</p>
                                        </div>
                                        <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Revision — its own section, mirrors "My Courses" */}
                        <div className="reveal">
                            <span className="section-kicker">Revision</span>
                            <div className="mt-6 space-y-4">
                                <Link
                                    to="/revision"
                                    className="group flex w-full items-center justify-between gap-4 rounded-2xl block-amber px-5 py-4 shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
                                >
                                    <div className="min-w-0 flex items-center gap-3">
                                        <BookmarkIcon className="w-5 h-5 shrink-0 text-accent" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">Archived slides</p>
                                            <p className="text-xs font-bold text-text-muted mt-1">
                                                {savedSlides.length} {savedSlides.length === 1 ? 'slide' : 'slides'} flagged
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link
                                    to="/essays"
                                    className="group flex w-full items-center justify-between gap-4 rounded-2xl block-cream px-5 py-4 shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
                                >
                                    <div className="min-w-0 flex items-center gap-3">
                                        <DocumentTextIcon className="w-5 h-5 shrink-0 text-accent" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">Essay Memoriser</p>
                                            <p className="text-xs font-bold text-text-muted mt-1">Practice your essays with AI</p>
                                        </div>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </div>

                        <div className="reveal rounded-3xl bg-[color:var(--mark-blue)] text-white p-10 relative overflow-hidden shadow-[0_30px_60px_-38px_rgba(19,81,170,0.7)]">
                            <div className="relative z-10">
                                <FireIcon className="w-10 h-10 text-white mb-7" />
                                <h4 className="font-display font-bold tracking-tight text-2xl mb-5">Daily Insight</h4>
                                <blockquote className="text-base font-medium leading-relaxed text-white/85 mb-7">
                                    "Compound interest is the eighth wonder of the world. He who understands it, earns it. He who does not, pays it."
                                </blockquote>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Albert Einstein</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
