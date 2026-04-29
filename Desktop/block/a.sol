// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract RegistroIdentidad is ERC721 {
    uint256 public contadorIdentidad;
    // Estructura para guardar la información de identidad
    struct Identidad {
        string nombre;
        string apellido;
        string dni;
        address verificadoPor; // Dirección de la entidad que verificó la identidad
    }

    mapping(uint256 => Identidad) public identidades;

    // El constructor recibe DNI, nombre y apellido y configura el nombre y símbolo del token
    constructor(string memory _dni, string memory _nombre, string memory _apellido) 
        ERC721(string(abi.encodePacked(_dni, "-NFT")), obtenerIniciales(_nombre, _apellido)) {
        contadorIdentidad = 0;
    }

    // Función para obtener las iniciales del nombre y apellido
    function obtenerIniciales(string memory _nombre, string memory _apellido) internal pure returns (string memory) {
        bytes memory iniciales = new bytes(3);
        iniciales[0] = bytes(_nombre)[0];
        iniciales[1] = bytes(_apellido)[0];
        iniciales[2] = bytes(_apellido)[1];

        return string(iniciales);
    }

    // Crear nueva identidad
    function crearIdentidad(
        address to,
        string memory _nombre,
        string memory _apellido,
        string memory _dni,
        address _verificadoPor
    ) public returns (uint256) {
        uint256 nuevaIdentidadId = contadorIdentidad;
        _safeMint(to, nuevaIdentidadId);
        identidades[nuevaIdentidadId] = Identidad({
            nombre: _nombre,
            apellido: _apellido,
            dni: _dni,
            verificadoPor: _verificadoPor
        });
        contadorIdentidad++;

        return nuevaIdentidadId;
    }
}
