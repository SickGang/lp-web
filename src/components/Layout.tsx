import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  VStack,
  Heading,
  Text,
  Flex,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerCloseButton,
  useDisclosure,
  Show,
  Hide,
} from "@chakra-ui/react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Car,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = useDisclosure();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navLinks: NavItem[] = [
    { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { to: "/bookings", label: "Записи на мойку", icon: CalendarDays },
    ...(user?.role === "OWNER"
      ? [
          { to: "/users", label: "Пользователи", icon: Users },
          { to: "/services", label: "Услуги", icon: Car },
        ]
      : []),
    { to: "/chemistry", label: "Учет химии", icon: FlaskConical },
    { to: "/settings", label: "Настройки", icon: Settings },
  ];

  const nav = (
    <VStack align="stretch" spacing={1} as="nav">
      {navLinks.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={menu.onClose}>
          {({ isActive }) => (
            <Box
              as="span"
              display="flex"
              alignItems="center"
              gap={3}
              px={4}
              py={2}
              borderRadius="md"
              bg={isActive ? "lp.input" : "transparent"}
              _hover={{ bg: "lp.input" }}
              color={isActive ? "lp.textPrimary" : "lp.textSecondary"}
              fontSize="sm"
            >
              <Icon size={18} strokeWidth={2} aria-hidden />
              {label}
            </Box>
          )}
        </NavLink>
      ))}
    </VStack>
  );

  return (
    <Flex minH="100vh" bg="lp.bg" color="lp.textPrimary" direction={{ base: "column", md: "row" }}>
      <Show below="md">
        <Flex
          as="header"
          align="center"
          justify="space-between"
          px={4}
          py={3}
          bg="lp.surface"
          borderBottom="1px solid"
          borderColor="lp.border"
          position="sticky"
          top={0}
          zIndex={20}
        >
          <Box>
            <Heading size="sm">LP Detailing</Heading>
            <Text fontSize="xs" color="lp.textMuted">
              {user?.name || user?.phone}
            </Text>
          </Box>
          <Button
            aria-label="Открыть меню"
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border text-foreground hover:bg-muted"
            onClick={menu.onOpen}
          >
            <Menu size={20} strokeWidth={2} />
          </Button>
        </Flex>
        <Drawer isOpen={menu.isOpen} placement="left" onClose={menu.onClose}>
          <DrawerOverlay />
          <DrawerContent bg="lp.surface" color="lp.textPrimary">
            <DrawerCloseButton />
            <DrawerHeader borderBottomWidth="1px" borderColor="lp.border">
              Навигация
            </DrawerHeader>
            <DrawerBody display="flex" flexDirection="column" gap={4} py={4}>
              {nav}
              <Button
                className="mt-auto border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                size="sm"
                variant="outline"
                onClick={handleLogout}
              >
                <LogOut size={16} strokeWidth={2} className="mr-2" />
                Выйти
              </Button>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </Show>
      <Hide below="md">
      <Box
        as="aside"
        w="260px"
        bg="lp.surface"
        color="lp.textPrimary"
        py={6}
        px={4}
        display="flex"
        flexDirection="column"
        borderRight="1px solid"
        borderColor="lp.border"
      >
        <VStack align="stretch" spacing={6} flex={1}>
          <Box>
            <Heading size="md" mb={2}>
              LP Detailing
            </Heading>
            <Text fontSize="sm" color="lp.textSecondary">
              {user?.name || user?.phone}
            </Text>
            <Text fontSize="xs" color="lp.textMuted">
              {user?.role === "OWNER" ? "Владелец" : "Администратор"}
            </Text>
          </Box>
          {nav}
        </VStack>
        <Button
          size="sm"
          variant="outline"
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut size={16} strokeWidth={2} className="mr-2" />
          Выйти
        </Button>
      </Box>
      </Hide>
      <Box as="main" flex={1} p={{ base: 4, md: 8 }} overflow="auto" bg="lp.bg">
        <Outlet />
      </Box>
    </Flex>
  );
};

export default Layout;
