import { useTheme } from '../contexts/ThemeContext';

const BackgroundTexture = () => {
  const { isDark } = useTheme();
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center"
      style={{
        backgroundImage: `url(${isDark ? '/dark1.jpg' : '/light1.jpg'})`,
        opacity: isDark ? 0.34 : 0.28,
      }}
    />
  );
};

export default BackgroundTexture;
