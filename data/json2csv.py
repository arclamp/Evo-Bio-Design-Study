import csv
import json
from pprint import pprint
import sys

from typing import Any, TextIO, Sequence, Set, Optional, Dict, Mapping
from mypy_extensions import TypedDict

class EdgeRow(TypedDict):
    _from: str
    _to: str


class PartitionSpec(TypedDict):
    root: str
    internal: Set[str]
    leaf: Set[str]


DataRow = Dict[str, Any]
IdTable = Mapping[str, int]


# Converts a string value to its most precise convertable form.
def upconvert(value: str) -> Any:
    try:
        return int(value)
    except ValueError:
        pass

    try:
        return float(value)
    except ValueError:
        pass

    return value


def parse_edge_file(stream: TextIO) -> Sequence[EdgeRow]:
    data = json.loads(stream.read())

    return [{'_from': row['From'], '_to': row['To']} for row in data['rows'] if row['From'] and row['To']]


def parse_edge_length_file(stream: TextIO) -> Sequence[float]:
    data = json.loads(stream.read())

    return [row['x'] for row in data['rows']]


def parse_data_file(stream: TextIO) -> Sequence[DataRow]:
    data = json.loads(stream.read())

    return data['rows']


def parse_leaf_file(stream: TextIO) -> Sequence[DataRow]:
    data = csv.DictReader(stream)

    ret = []
    for row in data:
        val = {}
        for t in row.items():
            val[t[0]] = upconvert(t[1])
        ret.append(val)

    return ret


def write_csv(data: Sequence[Mapping[str, Any]], stream: TextIO) -> None:
    writer = csv.DictWriter(stream, fieldnames = data[0].keys())

    writer.writeheader()
    for d in data:
        writer.writerow(d)


def tree_nodes(edges: Sequence[EdgeRow]) -> Set[str]:
    return set(edge['_from'] for edge in edges).union(set(edge['_to'] for edge in edges))


def partition_tree(edges: Sequence[EdgeRow]) -> PartitionSpec:
    # Create candidate sets for the root and leaf nodes respectively,
    # initializing them to set of all nodes.
    nodes = tree_nodes(edges)
    root_cand = set(nodes)
    leaf_cand = set(nodes)

    # Begin a sweep through the edge list, eliminating candidates from the sets
    # as we go.
    for edge in edges:
        # If a node is pointed to, then it cannot be the root.
        root_cand.discard(edge['_to'])

        # If it is being pointed from, then it cannot be a leaf.
        leaf_cand.discard(edge['_from'])

    # The internal nodes are the ones that are neither leaves nor the root.
    int_cand = nodes - root_cand - leaf_cand

    assert len(root_cand) == 1

    return {
        'root': root_cand.pop(),
        'internal': int_cand,
        'leaf': leaf_cand
    }


def generate_ids(s: Set[str]) -> IdTable:
    return {enum[1]: enum[0] for enum in enumerate(s)}


def assemble_internal_nodes(root_node: str, internal_nodes: Set[str], internal_data: Sequence[DataRow]) -> Sequence[DataRow]:
    ids = generate_ids(internal_nodes.union({root_node}))

    def augment(rec: DataRow) -> DataRow:
        rec['label'] = rec['nodeLabels']
        del rec['nodeLabels']

        rec['_key'] = ids[rec['label']]

        return rec

    data = sorted([augment(row) for row in internal_data], key = lambda row: row['_key'])

    return data


def assemble_leaf_nodes(leaf_nodes: Set[str], leaf_data: Sequence[DataRow]) -> Sequence[DataRow]:
    ids = generate_ids(leaf_nodes)

    def augment(rec: DataRow) -> Optional[DataRow]:
        # pprint(rec)
        rec['label'] = rec['species']
        del rec['species']

        try:
            rec['_key'] = ids[rec['label']]
        except KeyError:
            return None

        return rec

    data = [augment(row) for row in leaf_data]

    return sorted([x for x in data if x is not None], key = lambda row: row['_key'])


def main() -> int:
    basename = sys.argv[1]
    outname = sys.argv[2]

    edgefile = f'{basename}-edges.json'
    with open(edgefile) as stream:
        edges = parse_edge_file(stream)

    edgelengthfile = f'{basename}-edge-lengths.json'
    with open(edgelengthfile) as stream:
        edge_lengths = parse_edge_length_file(stream)

    resfile = f'{basename}-res.json'
    with open(resfile) as stream:
        res = parse_data_file(stream)

    leafattrfile = f'{basename}-leaf-data.csv'
    with open(leafattrfile) as stream:
        leaf = parse_leaf_file(stream)

    nodes = tree_nodes(edges)

    # pprint(nodes)
    # print(len(nodes))

    # pprint(edges)
    # pprint(edge_lengths)
    # pprint(res)
    # pprint(leaf)

    partition = partition_tree(edges)

    # pprint(partition)

    internal_data = assemble_internal_nodes(partition['root'], partition['internal'], res)
    leaf_data = assemble_leaf_nodes(partition['leaf'], leaf)

    # pprint(internal_data)
    # pprint(leaf_data)

    with open(f'{outname}-internal.csv', 'w') as out:
        write_csv(internal_data, out)

    with open(f'{outname}-leaf.csv', 'w') as out:
        write_csv(leaf_data, out)

    with open(f'{outname}-edges.csv', 'w') as out:
        write_csv(edges, out)

    return 0


if __name__ == '__main__':
    sys.exit(main())
