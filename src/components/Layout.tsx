import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";
import { useAuth } from "../hooks/useAuth";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarBg = useColorModeValue("gray.900", "gray.900");
  const navHoverBg = useColorModeValue("gray.800", "gray.700");
  const navActiveBg = useColorModeValue("gray.700", "gray.600");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { to: "/dashboard", label: "Дашборд", icon: "📊" },
    { to: "/bookings", label: "Записи на мойку", icon: "📅" },
    ...(user?.role === "OWNER"
      ? [{ to: "/users", label: "Пользователи", icon: "👥" }]
      : []),
    { to: "/chemistry", label: "Учет химии", icon: "🧪" },
  ];

  return (
    <Flex minH="100vh" bg="gray.50">
      <Box
        as="aside"
        w="260px"
        bg={sidebarBg}
        color="white"
        py={6}
        px={4}
        display="flex"
        flexDirection="column"
      >
        <VStack align="stretch" spacing={6} flex={1}>
          <Box>
            <Heading size="md" mb={2}>
              LP Detailing
            </Heading>
            <Text fontSize="sm" color="gray.400">
              {user?.name || user?.phone}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {user?.role === "OWNER" ? "Владелец" : "Администратор"}
            </Text>
          </Box>
          <VStack align="stretch" spacing={1} as="nav">
            {navLinks.map(({ to, label, icon }) => (
              <NavLink key={to} to={to}>
                {({ isActive }) => (
                  <Box
                    as="span"
                    display="block"
                    px={4}
                    py={2}
                    borderRadius="md"
                    bg={isActive ? navActiveBg : "transparent"}
                    _hover={{ bg: navHoverBg }}
                    color={isActive ? "white" : "gray.300"}
                    fontSize="sm"
                  >
                    {icon} {label}
                  </Box>
                )}
              </NavLink>
            ))}
          </VStack>
        </VStack>
        <Button
          size="sm"
          variant="ghost"
          colorScheme="gray"
          color="gray.400"
          _hover={{ bg: "gray.800", color: "white" }}
          onClick={handleLogout}
        >
          🚪 Выйти
        </Button>
      </Box>
      <Box as="main" flex={1} p={8} overflow="auto">
        <Outlet />
      </Box>
    </Flex>
  );
};

export default Layout;
