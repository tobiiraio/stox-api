import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./suppliers.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listSuppliers);
router.post("/", createSupplier);
router.patch("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;
