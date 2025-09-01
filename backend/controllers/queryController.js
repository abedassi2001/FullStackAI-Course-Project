// query.controller.js
// This file handles incoming HTTP requests for queries.
// It receives req/res from Express, calls the service, and returns a response.
//
// Example functions:
// - create(req, res, next): calls queryService.createQuery(req.user.id, req.body)
// - getOne(req, res, next): calls queryService.getQueryById(req.params.id)
// - getAll(req, res, next): calls queryService.getAllQueries()
// - update(req, res, next): calls queryService.updateQuery(req.params.id, req.body)
// - delete(req, res, next): calls queryService.deleteQuery(req.params.id)
//
// NOTE: Controller = ONLY request/response handling.
// All logic goes into service, and all DB work goes into repository.
