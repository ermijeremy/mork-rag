import re
from dataclasses import dataclass, field

_LINE_REGEX = re.compile(r'\(([\w-]+)\s+(A_\w+)\s+"([^"]+)"\)')


@dataclass
class Post:
    id: str
    properties: dict = field(default_factory=dict)


def parse(file_path: str) -> list[Post]:
    with open(file_path, "r", encoding="utf-8") as f:
        lines = [line for line in f.read().split("\n") if line.strip() != ""]

    posts: dict[str, Post] = {}
    for line in lines:
        match = _LINE_REGEX.search(line)
        if match:
            prop, post_id, value = match.groups()
            if post_id not in posts:
                posts[post_id] = Post(id=post_id)
            posts[post_id].properties[prop] = value

    return list(posts.values())


def to_embedding_string(post: Post) -> str:
    return " ".join(
        f'{key} {post.id} "{value}"' for key, value in post.properties.items()
    )
