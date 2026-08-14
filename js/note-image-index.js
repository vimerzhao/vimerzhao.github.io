(function () {
	"use strict";

	document.querySelectorAll(".note-preview__content, .note__content").forEach(function (content) {
		content.querySelectorAll("img").forEach(function (image, index) {
			var frame = document.createElement("span");
			frame.className = "note-image-frame";
			frame.setAttribute("aria-label", "图片 " + (index + 1));
			image.parentNode.insertBefore(frame, image);
			frame.appendChild(image);
			var badge = document.createElement("span");
			badge.className = "note-image-index";
			badge.setAttribute("aria-hidden", "true");
			badge.textContent = index + 1;
			frame.appendChild(badge);
		});

		if (!content.classList.contains("note-preview__content")) return;

		var groups = [];
		var group = [];
		Array.from(content.children).forEach(function (element) {
			var isImageParagraph = element.matches("p") && element.matches(":has(> .note-image-frame:only-child)");
			if (isImageParagraph) {
				group.push(element);
			} else if (group.length > 0) {
				groups.push(group);
				group = [];
			}
		});
		if (group.length > 0) groups.push(group);

		groups.forEach(function (group) {
			var grid = document.createElement("div");
			grid.className = "note-preview__image-grid";
			group[0].parentNode.insertBefore(grid, group[0]);
			group.forEach(function (paragraph) {
				grid.appendChild(paragraph);
			});
		});
	});
})();
