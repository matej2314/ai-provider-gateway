import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsThinkingBudget(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isThinkingBudget',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value === 'string') {
            return [
              'none',
              'minimal',
              'low',
              'medium',
              'high',
              'xhigh',
              'max',
            ].includes(value);
          }
          if (typeof value === 'number') {
            return value >= 1024;
          }
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be one of 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max' or minimum 1024`;
        },
      },
    });
  };
}
