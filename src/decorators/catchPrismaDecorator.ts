import { BadRequestException, NotFoundException } from '@nestjs/common';

export function mapPrismaErrorToHttpException(error: any) {
  if (error.code === 'P2002') {
    return new BadRequestException('Duplicate entry found');
  } else if (error.code === 'P2003') {
    return new BadRequestException('Key constraint failed');
  } else if (error.code === 'P2025') {
    return new NotFoundException('The record was not found');
  } else if (error.code === 'P2014') {
    return new BadRequestException(
      'The record violates the schema on relationship',
    );
  }
  if (error.name === 'PrismaClientValidationError') {
    return new BadRequestException('Some of the data is invalid');
  }
  return error;
}

export function catchPrismaErrorDecorator() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        throw mapPrismaErrorToHttpException(error);
      }
    };
    return descriptor;
  };
}
