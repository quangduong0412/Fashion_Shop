// Compatibility entry point: the maintained implementation uses compare-and-set
// updates so a concurrent password reset can never be overwritten.
import './scripts/hash-legacy-passwords';
