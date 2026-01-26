/**
 * version.test.ts - Tests unitarios para el módulo de versión
 *
 * Este archivo contiene tests para verificar que la constante de versión
 * de la aplicación está correctamente definida y sigue el formato semver.
 *
 * Semantic Versioning (SemVer) es un sistema de versionado que usa
 * el formato MAJOR.MINOR.PATCH:
 * - MAJOR: Cambios incompatibles con versiones anteriores
 * - MINOR: Nuevas funcionalidades compatibles hacia atrás
 * - PATCH: Corrección de bugs compatibles hacia atrás
 *
 * Ejemplos de versiones válidas: "1.0.0", "2.3.4", "0.5.2"
 *
 * La versión se muestra en el header de la aplicación para que
 * los usuarios puedan identificar qué versión están usando.
 */

import { APP_VERSION } from '@/lib/version';

/**
 * Suite de tests para la constante de versión.
 *
 * Estos tests aseguran que:
 * 1. APP_VERSION está exportada y es un string
 * 2. El formato sigue la convención semver (X.Y.Z)
 */
describe('Version', () => {
  /**
   * Verifica que APP_VERSION exporta un string.
   *
   * Este test básico asegura que la constante existe y tiene
   * el tipo correcto. Si alguien accidentalmente cambia el tipo
   * (ej: a número o undefined), este test fallará.
   */
  it('exports a version string', () => {
    expect(typeof APP_VERSION).toBe('string');
  });

  /**
   * Verifica que la versión sigue el formato semver.
   *
   * El regex /^\d+\.\d+\.\d+$/ verifica:
   * - ^ : Inicio del string
   * - \d+ : Uno o más dígitos (MAJOR)
   * - \. : Punto literal
   * - \d+ : Uno o más dígitos (MINOR)
   * - \. : Punto literal
   * - \d+ : Uno o más dígitos (PATCH)
   * - $ : Fin del string
   *
   * Ejemplos que pasan: "0.5.2", "1.0.0", "10.20.30"
   * Ejemplos que fallan: "v1.0.0", "1.0", "1.0.0-beta"
   */
  it('follows semver format', () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    expect(APP_VERSION).toMatch(semverRegex);
  });
});
