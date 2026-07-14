import { useState } from 'react';

const sizes = {
    sm: { shell: 'h-8 w-8 text-[10px]', dot: 'h-2 w-2 -bottom-0.5 -right-0.5' },
    md: { shell: 'h-10 w-10 text-xs', dot: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5' },
    lg: { shell: 'h-12 w-12 text-sm', dot: 'h-3 w-3 -bottom-0.5 -right-0.5' },
};

export default function UserAvatar({ user, size = 'md', className = '', showStatus = false }) {
    const [imageFailed, setImageFailed] = useState(false);
    const sizing = sizes[size] || sizes.md;
    const profilePicture = user?.profilePicture || user?.avatarUrl || user?.picture;
    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.firstName?.[0]?.toUpperCase() || 'U'
        : 'U';

    return (
        <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display font-extrabold leading-none text-white shadow-[0_8px_18px_-12px_rgba(19,81,170,0.7)] ring-1 ring-accent/20 ${sizing.shell} ${className}`}>
            {profilePicture && !imageFailed ? (
                <img src={profilePicture} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
            ) : (
                initials
            )}
            {showStatus && <span className={`absolute rounded-full border-2 border-surface-raised bg-[color:var(--mark-green)] ${sizing.dot}`} aria-hidden="true" />}
        </span>
    );
}
