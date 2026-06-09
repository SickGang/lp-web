import {
  Box,
  Card,
  CardBody,
  Heading,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useTheme, type ThemePreference } from '../hooks/useTheme';

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  {
    value: 'system',
    label: 'Системная',
    description: 'Как в настройках устройства или браузера',
  },
  {
    value: 'light',
    label: 'Светлая',
    description: 'Светлый фон и тёмный текст',
  },
  {
    value: 'dark',
    label: 'Тёмная',
    description: 'Тёмный фон, как в приложении по умолчанию',
  },
];

const Settings = () => {
  const preference = useTheme((s) => s.preference);
  const setPreference = useTheme((s) => s.setPreference);

  return (
    <Box>
      <Heading size="lg" color="lp.textPrimary" mb={1}>
        Настройки
      </Heading>
      <Text color="lp.textSecondary" fontSize="sm" mb={8}>
        Параметры админ-панели
      </Text>

      <Card maxW="560px">
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <Box>
              <Heading size="md" color="lp.textPrimary" mb={1}>
                Тема оформления
              </Heading>
              <Text fontSize="sm" color="lp.textMuted">
                Внешний вид интерфейса на этом устройстве
              </Text>
            </Box>

            <RadioGroup
              value={preference}
              onChange={(value) => setPreference(value as ThemePreference)}
            >
              <Stack spacing={3}>
                {THEME_OPTIONS.map(({ value, label, description }) => (
                  <Box
                    key={value}
                    px={4}
                    py={3}
                    borderRadius="12px"
                    borderWidth="1px"
                    borderColor={preference === value ? 'lp.accent' : 'lp.border'}
                    bg={preference === value ? 'lp.input' : 'transparent'}
                    cursor="pointer"
                    onClick={() => setPreference(value)}
                  >
                    <Radio value={value} colorScheme="blue" width="100%">
                      <Box ml={2}>
                        <Text fontWeight="600" color="lp.textPrimary">
                          {label}
                        </Text>
                        <Text fontSize="sm" color="lp.textMuted">
                          {description}
                        </Text>
                      </Box>
                    </Radio>
                  </Box>
                ))}
              </Stack>
            </RadioGroup>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Settings;
