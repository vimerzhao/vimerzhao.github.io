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
	});
})();
