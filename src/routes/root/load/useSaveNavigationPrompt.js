import { useEffect, useRef } from "react";
import { unstable_usePrompt as usePrompt, useActionData, useNavigation } from "react-router";

export default function useSaveNavigationPrompt(enabled = true) {
  const saving = useRef(false);
  const navigation = useNavigation();
  const actionData = useActionData();

  usePrompt({
    message: "Hay cambios sin guardar. ¿Desea salir de esta página?",
    when: () => enabled && !saving.current,
  });

  useEffect(() => {
    if (navigation.state === "idle") saving.current = false;
  }, [navigation.state, actionData]);

  function allowSaveNavigation() {
    saving.current = true;
  }

  return allowSaveNavigation;
}
