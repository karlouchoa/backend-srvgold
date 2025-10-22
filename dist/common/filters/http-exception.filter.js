"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    logger = new common_1.Logger(HttpExceptionFilter_1.name);
    catch(exception, host) {
        const context = host.switchToHttp();
        const response = context.getResponse();
        const request = context.getRequest();
        const { status, body } = this.resolveException(exception);
        this.logger.error(`[${request.method}] ${request.url} -> ${status} :: ${body.message}`, exception instanceof Error ? exception.stack : undefined);
        response.status(status).json({
            success: false,
            message: body.message,
            error: body.error,
            statusCode: status,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
    resolveException(exception) {
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();
            const message = this.normalizeMessage(response);
            const error = this.normalizeError(response);
            return {
                status,
                body: {
                    message,
                    error,
                },
            };
        }
        return {
            status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            body: {
                message: 'Internal server error.',
                error: 'InternalServerError',
            },
        };
    }
    normalizeMessage(response) {
        if (typeof response === 'string') {
            return response;
        }
        if (response && typeof response === 'object') {
            const body = response;
            if (Array.isArray(body.message)) {
                return body.message.join('; ');
            }
            if (typeof body.message === 'string') {
                return body.message;
            }
        }
        return 'Unexpected error.';
    }
    normalizeError(response) {
        if (typeof response === 'string') {
            return response;
        }
        if (response && typeof response === 'object') {
            const body = response;
            if (typeof body.error === 'string') {
                return body.error;
            }
        }
        return 'Error';
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map