import { Request, Response } from "express";
import { conectarDB } from "../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ============================================
// LOGIN
// ============================================

export const login = async (req: Request, res: Response) => {
    try {
        const { correo, password } = req.body;

        // 1. Validar campos
        if (
            typeof correo !== "string" ||
            typeof password !== "string" ||
            !correo.trim() ||
            !password.trim()
        ) {
            return res.status(400).json({
                mensaje: "Ingresa tu correo y contraseña"
            });
        }

        // 2. Validar configuración JWT
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            console.error("JWT_SECRET no está configurado");

            return res.status(500).json({
                mensaje: "Error de configuración del servidor"
            });
        }

        // 3. Conectar con SQL Server
        const pool = await conectarDB();

        // 4. Buscar usuario
        const resultado = await pool.request()
            .input("correo", correo.trim())
            .query(`
                SELECT
                    id_usuario,
                    nombre,
                    correo,
                    password,
                    estado,
                    rol
                FROM dbo.usuarios
                WHERE correo = @correo
            `);

        // 5. Comprobar existencia
        if (resultado.recordset.length === 0) {
            return res.status(401).json({
                mensaje: "Usuario o contraseña incorrectos"
            });
        }

        const usuario = resultado.recordset[0];

        // 6. Verificar contraseña
        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                mensaje: "Usuario o contraseña incorrectos"
            });
        }

        // 7. Verificar estado
        if (
            String(usuario.estado).toLowerCase() !== "activo"
        ) {
            return res.status(403).json({
                mensaje: "El usuario se encuentra inactivo"
            });
        }

        // 8. Verificar rol
        const rolesPermitidos = ["admin", "mesero", "cocina"];

        const rol = String(usuario.rol).toLowerCase();

        if (!rolesPermitidos.includes(rol)) {
            return res.status(403).json({
                mensaje: "El usuario no tiene un rol válido"
            });
        }

        // 9. Generar token JWT
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                correo: usuario.correo,
                rol: rol
            },
            jwtSecret,
            {
                expiresIn: "8h"
            }
        );

        // 10. Respuesta al frontend
        return res.status(200).json({
            mensaje: "Inicio de sesión exitoso",

            token,

            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: rol
            }
        });

    } catch (error) {
        console.error("Error en login:", error);

        return res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
};