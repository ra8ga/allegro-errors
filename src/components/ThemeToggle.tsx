import { useTheme } from "better-themes";
import { SunIcon, MoonIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="h-9 w-9 rounded-lg"
            aria-label={isDark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
        >
            {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </Button>
    );
}
