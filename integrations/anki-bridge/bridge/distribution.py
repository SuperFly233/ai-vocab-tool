import hashlib
import json
from pathlib import Path

RECEIPT = '.bridge-selftest.json'


def manifest(directory):
    root = Path(directory).resolve()
    result = {}
    for path in sorted(root.rglob('*')):
        if path.is_symlink() or path.is_junction():
            raise RuntimeError('Linked files are not allowed in a release')
        if not path.is_file() or path == root / RECEIPT:
            continue
        with path.open('rb') as stream:
            result[path.relative_to(root).as_posix()] = hashlib.file_digest(stream, 'sha256').hexdigest()
    if not result:
        raise RuntimeError('Empty release directory')
    return result


def write_receipt(directory, version, python):
    root = Path(directory)
    data = {'passed': True, 'version': version, 'python': python, 'files': manifest(root)}
    (root / RECEIPT).write_text(json.dumps(data, indent=2), 'utf-8')


def verified_files(directory, version):
    root = Path(directory)
    try:
        receipt = json.loads((root / RECEIPT).read_text('utf-8'))
    except (OSError, ValueError) as error:
        raise RuntimeError('Run a successful portable self-test before packaging') from error
    if receipt.get('passed') is not True or receipt.get('version') != version or receipt.get('files') != manifest(root):
        raise RuntimeError('Release contents changed or self-test failed; refusing to package')
    return receipt['files']
