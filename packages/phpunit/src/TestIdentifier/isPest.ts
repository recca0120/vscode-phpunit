const pestPattern = /^pest|^P\\|^pest_qn:\/\/|^file:\/\//i;

export const isPest = (text: string) => pestPattern.test(text);
