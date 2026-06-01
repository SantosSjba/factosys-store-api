import { ValidationError } from 'class-validator';

export function flattenValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }

    if (error.children?.length) {
      messages.push(...flattenValidationErrors(error.children));
    }
  }

  return messages;
}
