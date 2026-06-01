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
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = useDisclosure();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navLinks = [
    { to: "/dashboard", label: "Дашборд" },
    { to: "/bookings", label: "Записи на мойку" },
    ...(user?.role === "OWNER"
      ? [
          { to: "/users", label: "Пользователи" },
          { to: "/services", label: "Услуги" },
        ]
      : []),
    { to: "/chemistry", label: "Учет химии" },
  ];

  const nav = (
    <VStack align="stretch" spacing={1} as="nav">
      {navLinks.map(({ to, label }) => (
        <NavLink key={to} to={to} onClick={menu.onClose}>
          {({ isActive }) => (
            <Box
              as="span"
              display="block"
              px={4}
              py={2}
              borderRadius="md"
              bg={isActive ? "lp.input" : "transparent"}
              _hover={{ bg: "lp.input" }}
              color={isActive ? "lp.textPrimary" : "lp.textSecondary"}
              fontSize="sm"
            >
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
            className="h-9 w-9 border-[#3A3A3C] text-white hover:bg-[#27292D]"
            onClick={menu.onOpen}
          >
            <span className="text-lg leading-none">☰</span>
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
                className="mt-auto border-[#3A3A3C] text-[#CCCCCC] hover:bg-[#27292D] hover:text-white"
                size="sm"
                variant="outline"
                onClick={handleLogout}
              >
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
          className="border-[#3A3A3C] text-[#CCCCCC] hover:bg-[#27292D] hover:text-white"
          onClick={handleLogout}
        >
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
