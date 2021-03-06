'use strict';

import { BaseService } from './base.service';
import { BaseModel } from './base.model';
import * as Joi from 'joi';
import { GET, Abstract, Path, POST, Return, Errors, PathParam, DELETE, PUT } from 'typescript-rest';
import { InsertResult, DeleteResult, UpdateResult } from 'typeorm';

export enum ORDER {
    ASC = 'ASC',
    DESC = 'DESC'
}

/**
 * @author lucasalvesteixeira
 */
@Abstract
export abstract class BaseController<T extends BaseModel> { 

    constructor(private service: BaseService<T>) { }
    
    public abstract getValidationSchema(): Joi.Schema;
    public abstract getEndpointPermission(): any;

    @GET
    @Path('/:recordsByPage/:page/:sort')
    protected list(
        @PathParam('recordsByPage') recordsByPage: number,
        @PathParam('page') page: number,
        @PathParam('sort') sort: ORDER
    ): Promise<Array<T>> {
        return new Promise((resolve, reject) => {
            if(this.getEndpointPermission().list) {
                this.service.list(
                    recordsByPage,
                    page,
                    sort
                )
                .then(resolve)
                .catch(reject);
            } else {
                throw new Errors.UnauthorizedError('Unauthorized route');
            }
        });
    }

    @GET
    @Path('/:id')
    protected get(@PathParam('id') _id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            if(this.getEndpointPermission().get) {
                this.service.get(_id)
                    .then(resolve)
                    .catch(reject);
            } else {
                throw new Errors.UnauthorizedError('Unauthorized route');
            }
        });
    }

    @POST
    protected create(entities: Array<T>): Promise<Return.NewResource<any>> {
        return new Promise((resolve, reject) => {
            if(this.getEndpointPermission().create) {
                this.validateEntity(entities)
                    .catch(err => {throw new Errors.BadRequestError(JSON.stringify(err));})
                    .then(() => {
                        this.service.create(entities).then((insertResult: InsertResult) => {
                            resolve(new Return.NewResource('apis/create', {
                                'insertedCount': insertResult.identifiers.length,
                                'insertedIds': insertResult.identifiers
                            }));
                        }).catch(reject);
                    }).catch(reject);
            } else {
                throw new Errors.UnauthorizedError('Unauthorized route');
            }
        });
    }

    @DELETE
    protected delete(_ids: Array<T>): Promise<Return.NewResource<any>> {
        return new Promise((resolve, reject) => {
            if(this.getEndpointPermission().delete) {
                this.service.delete(_ids).then((deleteResult: DeleteResult) => {
                    resolve(new Return.NewResource('apis/delete', {
                        'deletedCount': deleteResult.affected
                    }));
                }).catch(reject);
            } else {
                throw new Errors.UnauthorizedError('Unauthorized route');
            }
        });
    }

    @PUT
    @Path('/:id')
    protected update(@PathParam('id') _id: string, entity: T): Promise<Return.NewResource<any>> {
        return new Promise((resolve, reject) => {
            if(this.getEndpointPermission().update) {
                this.validateEntity([entity])
                    .catch(err => {throw new Errors.BadRequestError(JSON.stringify(err));})
                    .then(() => {
                        this.service.update(_id, entity).then((updateResult: UpdateResult) =>{
                            resolve(new Return.NewResource('apis/update', {
                                'affected': updateResult.affected
                            }));
                        }).catch(reject);
                    }).catch(reject);
            } else {
                throw new Errors.UnauthorizedError('Unauthorized route');
            }
        });
    }

    protected validateEntity(entities: Array<T>): Promise<Array<T>> {
        const schema: Joi.Schema = this.getValidationSchema();        
        if(!schema) {
            return Promise.resolve(entities);
        }
        const promises = entities.map(entity => {
            return new Promise((resolve, reject) => {
                Joi.validate(entity, schema, (err: any, value: T) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(value);
                    }
                });
            });
        });
        return Promise.all(promises).then();
    }
}
